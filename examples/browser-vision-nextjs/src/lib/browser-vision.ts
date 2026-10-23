import { AnamEvent, MessageRole } from "@anam-ai/js-sdk";
import type { AnamClient, MessageStreamEvent } from "@anam-ai/js-sdk";
import { createSightline, describeElement } from "@smidge/sightline";
import type { PageChange } from "@smidge/sightline";

// A plain page update has to change at least this many outline lines before
// we tell the persona about it. Smaller ones (a counter ticking, a field
// filling in) would only add noise.
const MIN_CHANGED_LINES = 6;

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
    viewport: true, // mark controls scrolled out of view
    maxChars: 4000, // about 1,000 tokens per outline
  });

  const stopLooking = client.registerToolCallHandler("look_at_screen", {
    onStart: async () =>
      sightline.capture()?.text ?? "The page is still loading.",
  });

  const stopHighlighting = client.registerToolCallHandler("highlight", {
    onStart: async ({ arguments: args }) => {
      const name = String(args.name ?? "");
      const element = findControl(name, args.ref);
      if (!element) {
        return `There is no "${name}" on the screen. Call look_at_screen and use a name from it.`;
      }
      sightline.highlight(element);
      return `"${name}" is highlighted. Now tell the user the step in one short sentence.`;
    },
  });

  // Models sometimes pass the ref from the line next to the one they mean,
  // so a ref only wins when it points at a control with the same name.
  function findControl(name: string, ref?: string) {
    const byRef = ref ? sightline.resolve(ref) : null;
    const refName = describeElement(byRef, { skip: options.skip })?.name;
    if (byRef && refName?.toLowerCase() === name.toLowerCase()) return byRef;
    return sightline.find(name);
  }

  // Context sent before the persona is ready is dropped. The greeting means
  // it is ready, so start watching the page when the first words arrive.
  let stopWatching = () => {};
  const onFirstWords = (event: MessageStreamEvent) => {
    if (event.role !== MessageRole.PERSONA) return;
    client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onFirstWords);
    stopWatching = sightline.watch((change) => {
      const message = describeChange(change);
      if (message && client.isStreaming()) client.addContext(message);
    });
  };
  client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onFirstWords);

  return () => {
    client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onFirstWords);
    stopWatching();
    stopLooking();
    stopHighlighting();
  };
}

function describeChange(change: PageChange): string | null {
  const outline = change.outline.text;
  switch (change.kind) {
    case "initial":
      return `[screen] The user has ${change.path} open.\n${outline}`;
    case "navigation":
      return `[screen] The user moved to ${change.path}.\n${outline}`;
    case "dialog-opened":
      return `[screen] A dialog opened.\n${outline}`;
    case "dialog-closed":
      return `[screen] The dialog closed. The page now shows:\n${outline}`;
    case "alert":
      return `[screen] New message on screen: ${change.alerts.map((text) => `"${text}"`).join(", ")}`;
    case "update": {
      const changed = change.diff.added.length + change.diff.removed.length;
      if (changed < MIN_CHANGED_LINES) return null;
      return `[screen] The page changed. It now shows:\n${outline}`;
    }
  }
}
