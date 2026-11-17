"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnamEvent, ConnectionClosedCode, createClient, MessageRole } from "@anam-ai/js-sdk";
import type { AnamClient, MessageStreamEvent } from "@anam-ai/js-sdk";
import type { ProductSummary } from "@/lib/catalog";
import { registerShoppingTools } from "@/lib/shopping-tools";

type Status = "idle" | "connecting" | "connected" | "error";

async function fetchSessionToken(signal: AbortSignal): Promise<string> {
  const response = await fetch("/api/session-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: location.pathname }),
    // Give up after 20 seconds, or as soon as the shopper cancels.
    signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.sessionToken !== "string") {
    throw new Error(data.error || "The assistant is unavailable right now.");
  }
  return data.sessionToken;
}

export function AssistantDock() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [draft, setDraft] = useState("");
  const clientRef = useRef<AnamClient | null>(null);
  const readyRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  async function start() {
    if (cleanupRef.current) return;
    const attempt = new AbortController();
    let client: AnamClient | null = null;
    let stopTools = () => {};
    const cleanup = () => {
      if (attempt.signal.aborted) return;
      attempt.abort();
      cleanupRef.current = null;
      clientRef.current = null;
      readyRef.current = false;
      stopTools();
      void client?.stopStreaming().catch((error) => {
        console.error("Couldn't stop the avatar session", error);
      });
    };
    cleanupRef.current = cleanup;
    setStatus("connecting");
    setError(null);
    setProducts([]);
    try {
      const startPath = location.pathname;
      const token = await fetchSessionToken(attempt.signal);
      if (attempt.signal.aborted) return;
      client = createClient(token);
      clientRef.current = client;

      // Ending the call aborts attempt.signal, which stops any tool work
      // that's still running.
      stopTools = registerShoppingTools(client, { showProducts: setProducts }, attempt.signal);

      // Context sent before the persona is ready is dropped, so page changes
      // are only sent once the greeting has started.
      const onGreeting = (event: MessageStreamEvent) => {
        if (attempt.signal.aborted || event.role !== MessageRole.PERSONA) return;
        readyRef.current = true;
        client?.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onGreeting);
        // The prompt describes the page the call started on. If the shopper
        // has moved on since, say where they are now.
        if (location.pathname !== startPath) {
          client?.addContext(`[visitor opened ${location.pathname}]`);
        }
      };
      client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, onGreeting);
      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
        if (!attempt.signal.aborted) setStatus("connected");
      });
      client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
        if (attempt.signal.aborted) return;
        cleanup();
        if (reason === ConnectionClosedCode.NORMAL) {
          setStatus("idle");
        } else {
          setError(details || `Connection closed: ${reason}`);
          setStatus("error");
        }
      });

      await client.streamToVideoElement("assistant-video");
    } catch (err) {
      if (attempt.signal.aborted) return;
      cleanup();
      const timedOut = err instanceof DOMException && err.name === "TimeoutError";
      setError(
        !timedOut && err instanceof Error ? err.message : "The assistant is unavailable right now.",
      );
      setStatus("error");
    }
  }

  function stop() {
    cleanupRef.current?.();
    setStatus("idle");
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !clientRef.current) return;
    clientRef.current.sendUserMessage(text);
    setDraft("");
  }

  // The dock lives in the root layout, so the call carries on when the
  // shopper opens another page. Tell the persona where they went.
  useEffect(() => {
    if (!readyRef.current) return;
    try {
      clientRef.current?.addContext(`[visitor opened ${pathname}]`);
    } catch (error) {
      console.error("Couldn't send the page to the persona", error);
    }
  }, [pathname]);

  useEffect(() => () => cleanupRef.current?.(), []);

  const message = {
    idle: "Ask Mia, our AI assistant, to find something or add it to your cart.",
    connecting: "Connecting…",
    connected: "Connected to Mia.",
    error: error ?? "The assistant is unavailable right now.",
  }[status];

  return (
    <aside
      aria-label="Mia, AI shopping assistant"
      className="fixed bottom-5 right-5 z-50 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
    >
      <p role="status" className="sr-only">
        {message}
      </p>
      <div className="relative aspect-[3/2] bg-stone-900">
        <video id="assistant-video" autoPlay playsInline className="h-full w-full object-cover" />
        {status !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-stone-300">
            {status === "error" ? <span className="text-red-300">{message}</span> : message}
          </div>
        )}
      </div>

      {products.length > 0 && (
        <ul aria-label="Suggested products" className="grid grid-cols-3 gap-2 border-b border-stone-200 p-2">
          {products.map((product) => (
            <li key={product.handle}>
              <Link
                href={`/products/${product.handle}`}
                className="block rounded-lg bg-stone-100 p-2 text-xs hover:bg-stone-200"
              >
                <span className="line-clamp-2 font-medium">{product.title}</span>
                <span className="text-stone-600">{product.available ? product.price : "Sold out"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 p-3">
        {status === "connected" && (
          <form onSubmit={send} className="flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Type a message to Mia"
              placeholder="Or type here…"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-lg bg-stone-100 px-3 text-sm font-medium hover:bg-stone-200">
              Send
            </button>
          </form>
        )}
        {status === "connected" || status === "connecting" ? (
          <button
            onClick={stop}
            className="w-full rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-900 hover:bg-stone-200"
          >
            {status === "connecting" ? "Cancel" : "End call"}
          </button>
        ) : (
          <button
            onClick={start}
            className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {status === "error" ? "Try again" : "Talk to Mia"}
          </button>
        )}
        <p className="text-center text-[11px] text-stone-500">Mia is an AI assistant.</p>
      </div>
    </aside>
  );
}
