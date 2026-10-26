"use client";

import { useEffect, useRef, useState } from "react";
import { AnamEvent, ConnectionClosedCode, createClient } from "@anam-ai/js-sdk";
import type { AnamClient } from "@anam-ai/js-sdk";
import { giveBrowserVision } from "@/lib/browser-vision";

type Status = "idle" | "connecting" | "connected" | "error";

async function fetchSessionToken(signal: AbortSignal): Promise<string> {
  const response = await fetch("/api/session-token", { method: "POST", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to get session token");
  if (typeof data.sessionToken !== "string" || !data.sessionToken) {
    throw new Error("Failed to get session token");
  }
  return data.sessionToken;
}

export function AvatarDock() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef<AbortController | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  async function start() {
    if (attemptRef.current) return;
    const attempt = new AbortController();
    attemptRef.current = attempt;
    let client: AnamClient | null = null;
    let stopVision = () => {};
    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      attempt.abort();
      stopVision();
      void client?.stopStreaming().catch(() => {
        console.error("Couldn't stop the avatar session");
      });
    };
    cleanupRef.current = cleanup;
    setStatus("connecting");
    setError(null);
    try {
      const token = await fetchSessionToken(attempt.signal);
      if (attempt.signal.aborted) return;
      client = createClient(token);

      // Register the tools and greeting listener before streaming starts.
      stopVision = giveBrowserVision(client, {
        skip: "[data-avatar-dock]",
      });

      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
        if (attemptRef.current === attempt) setStatus("connected");
      });
      client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
        if (attemptRef.current !== attempt) return;
        attemptRef.current = null;
        cleanupRef.current = null;
        cleanup();
        if (reason === ConnectionClosedCode.NORMAL) {
          setStatus("idle");
        } else {
          setError(details || `Connection closed: ${reason}`);
          setStatus("error");
        }
      });

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      if (attemptRef.current !== attempt) return;
      attemptRef.current = null;
      cleanupRef.current = null;
      cleanup();
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStatus("error");
    }
  }

  function stop() {
    attemptRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    setStatus("idle");
  }

  useEffect(() => {
    return () => {
      attemptRef.current = null;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return (
    <aside
      data-avatar-dock
      aria-label="Mia, your guide"
      className="fixed bottom-5 right-5 z-50 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
    >
      <p role="status" className="sr-only">
        {status === "connecting" && "Connecting…"}
        {status === "connected" && "Connected to Mia."}
        {status === "idle" && "Ready to talk to Mia."}
        {status === "error" && error}
      </p>
      <div className="relative aspect-[3/2] bg-zinc-900">
        <video
          id="avatar-video"
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        {status !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-zinc-300">
            {status === "connecting" && "Connecting…"}
            {status === "idle" && "Ask Mia how to do anything in Acme Cloud."}
            {status === "error" && <span className="text-red-300">{error}</span>}
          </div>
        )}
      </div>
      <div className="p-3">
        {status === "connected" ? (
          <button
            onClick={stop}
            className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
          >
            End call
          </button>
        ) : (
          <button
            onClick={start}
            disabled={status === "connecting"}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {status === "error" ? "Try again" : "Talk to Mia"}
          </button>
        )}
      </div>
    </aside>
  );
}
