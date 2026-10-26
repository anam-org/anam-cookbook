import { AnamEvent, MessageRole } from "@anam-ai/js-sdk";
import type { AnamClient, MessageStreamEvent } from "@anam-ai/js-sdk";
import {
  createSightline,
  describeElement,
  diffLines,
} from "@smidge/sightline";
import type { PageChange } from "@smidge/sightline";

// A plain page update has to add or remove at least this many outline lines,
// compared with the last outline we sent, before we tell the persona about it.
// Smaller ones (a switch flipping, a field filling in) would only add noise.
const MIN_CHANGED_LINES = 6;

// Long enough for the tool result to reach the persona and for it to start
// saying the step.
const RING_MS = 6000;

/**
 * Lets the persona see the page. Sightline turns the page into a text
 * outline, which reaches the LLM as silent context whenever the user moves
 * around, and two client tools let the persona read the screen on demand and
 * point at controls. Returns a function that stops it all.
 */
export function giveBrowserVision(
  client: AnamClient,
  options: { skip?: string } = {}
) {
  const sightline = createSightline({
    skip: options.skip, // never describe the avatar's own UI
    maxChars: 4000, // about 1,000 tokens per outline
  });

  // The last outline the persona received, from us or from a tool result.
  let sent = "";

  function screen() {
    const outline = sightline.capture();
    if (!outline) return "[screen] The page is empty or still loading.";
    sent = outline.text;
    return `[screen] The page right now:\n${outline.text}`;
  }

  const stopLooking = client.registerToolCallHandler("look_at_screen", {
    onStart: async () => screen(),
  });

  const stopHighlighting = client.registerToolCallHandler("highlight", {
    onStart: async ({ arguments: args }) => {
      // Models sometimes copy the quotes from the outline along with the name.
      const name = String(args.name ?? "").replace(/["“”]/g, "").trim();
      const element = controlFor(name, args.ref);
      if (!element) {
        // Send the screen back so the persona can recover without another
        // round trip.
        return `Not found on the screen. It may be on another page or in a closed menu.\n${screen()}`;
      }
      sightline.highlight(element, { durationMs: RING_MS });
      return "Highlighted.";
    },
  });

  // A ref only counts if it's in the outline right now, so a control behind
  // an open dialog can't be ringed. Models sometimes pass the ref from the
  // line next to the one they mean, so the name has to match too.
  function controlFor(name: string, ref: unknown) {
    const id = typeof ref === "string" ? ref.match(/e\d+/)?.[0] : undefined;
    const outline = sightline.capture();
    if (!outline || !name) return;
    // Sightline can retain refs for lines removed by its character budget.
    const refs = new Map([...outline.refs].filter(([ref]) =>
      outline.text.includes(`[ref=${ref}]`)
    ));
    const matches = (element: Element) =>
      describeElement(element, { skip: options.skip })?.name.toLowerCase() ===
      name.toLowerCase();
    const byRef = id ? refs.get(id) : undefined;
    if (byRef && matches(byRef)) return byRef;
    // Only fall back when the current outline has one unambiguous match.
    const candidates = [...refs.values()].filter(matches);
    if (candidates.length === 1) return candidates[0];
  }

  // Send each change the persona needs to know about, and remember what we
  // sent so small changes add up until they're worth sending.
  function onChange(change: PageChange) {
    const message = describeChange(change, sent);
    if (!message || !client.isStreaming()) return;
    try {
      client.addContext(message);
      sent = change.outline.text;
    } catch (error) {
      console.error("Couldn't send the page to the persona", error);
    }
  }

  // Context sent before the persona is ready is dropped. The greeting means
  // it is ready, so start watching the page when the first words arrive.
  let stopWatching = () => {};
  const onFirstWords = (event: MessageStreamEvent) => {
    if (event.role !== MessageRole.PERSONA) return;
    client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onFirstWords);
    stopWatching = sightline.watch(onChange);
  };
  client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onFirstWords);

  return () => {
    client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onFirstWords);
    stopWatching();
    stopLooking();
    stopHighlighting();
  };
}

function describeChange(change: PageChange, sent: string): string | null {
  const outline = change.outline.text;
  switch (change.kind) {
    case "initial":
      return `[screen] The page the user has open:\n${outline}`;
    case "navigation":
      return `[screen] The user moved to another page:\n${outline}`;
    case "dialog-opened":
      return `[screen] A dialog opened:\n${outline}`;
    case "dialog-closed":
      return `[screen] The dialog closed. The page now shows:\n${outline}`;
    case "alert": {
      const texts = change.alerts.map((text) => `"${text}"`).join(", ");
      return `[screen] New message on screen: ${texts}. The page now shows:\n${outline}`;
    }
    case "update": {
      const { added, removed } = diffLines(sent, outline);
      if (added.length + removed.length < MIN_CHANGED_LINES) return null;
      return `[screen] The page changed. It now shows:\n${outline}`;
    }
  }
}
