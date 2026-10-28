import { AnamEvent, MessageRole } from "@anam-ai/js-sdk";
import type { AnamClient, MessageStreamEvent } from "@anam-ai/js-sdk";
import { createSightline, describeElement } from "@smidge/sightline";

export function giveBrowserVision(client: AnamClient, skip = "[data-avatar-dock]") {
  const sightline = createSightline({ skip, maxChars: 4000 });
  const screen = () =>
    `[screen] ${sightline.capture()?.text ?? "The page is empty or loading."}`;

  const stopReading = client.registerToolCallHandler("look_at_screen", {
    onStart: async () => screen(),
  });

  const stopHighlighting = client.registerToolCallHandler("highlight", {
    onStart: async ({ arguments: args }) => {
      const name = String(args.name ?? "").trim().replace(/^["“](.*)["”]$/, "$1");
      const ref = String(args.ref ?? "").match(/e\d+/)?.[0];
      if (!name) return `Not found or ambiguous.\n${screen()}`;
      const refs = sightline.capture()?.refs ?? new Map<string, Element>();
      const matches = (element: Element) =>
        describeElement(element, { skip })?.name.replace(/"/g, "'").toLowerCase() ===
        name.replace(/"/g, "'").toLowerCase();
      const byRef = ref ? refs.get(ref) : undefined;
      const candidates = [...refs.values()].filter(matches);
      // Trust a matching current ref, or one unambiguous name in this outline.
      let target = byRef && matches(byRef) ? byRef : undefined;
      if (!target && candidates.length === 1) target = candidates[0];
      if (!target) return `Not found or ambiguous.\n${screen()}`;
      sightline.highlight(target, { durationMs: 6000 });
      return "Highlighted.";
    },
  });

  let stopWatching = () => {};
  const onGreeting = (event: MessageStreamEvent) => {
    if (event.role !== MessageRole.PERSONA) return;
    client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onGreeting);
    // Wait for the greeting so the session can accept silent context.
    stopWatching = sightline.watch(({ outline }) => {
      if (!client.isStreaming()) return;
      try {
        client.addContext(`[screen] ${outline.text}`);
      } catch (error) {
        console.error("Couldn't send the page to the persona", error);
      }
    }, { updates: false });
  };
  client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onGreeting);

  return () => {
    client.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onGreeting);
    stopWatching();
    stopReading();
    stopHighlighting();
  };
}
