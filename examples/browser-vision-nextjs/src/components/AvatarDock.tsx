"use client";

import { useEffect, useRef, useState } from "react";
import { AnamEvent, ConnectionClosedCode, createClient } from "@anam-ai/js-sdk";
import type { AnamClient } from "@anam-ai/js-sdk";
import { giveBrowserVision } from "@/lib/browser-vision";

type Status = "idle" | "connecting" | "connected" | "error";

async function fetchSessionToken(signal: AbortSignal): Promise<string> {
  const response = await fetch("/api/session-token", { method: "POST", signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Failed to get session token");
  if (typeof data.sessionToken !== "string" || !data.sessionToken) {
    throw new Error("Failed to get session token");
  }
  return data.sessionToken;
}

export function AvatarDock() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  async function start() {
    if (cleanupRef.current) return;
    // Aborting also makes late SDK events from this call harmless.
    const attempt = new AbortController();
    let client: AnamClient | null = null;
    let stopVision = () => {};
    const cleanup = () => {
      if (attempt.signal.aborted) return;
      attempt.abort();
      cleanupRef.current = null;
      stopVision();
      void client?.stopStreaming().catch((error) => {
        console.error("Couldn't stop the avatar session", error);
      });
    };
    cleanupRef.current = cleanup;
    setStatus("connecting");
    setError(null);
    try {
      const token = await fetchSessionToken(attempt.signal);
      if (attempt.signal.aborted) return;
      client = createClient(token);

      stopVision = giveBrowserVision(client);

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

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      if (attempt.signal.aborted) return;
      cleanup();
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStatus("error");
    }
  }

  function stop() {
    cleanupRef.current?.();
    setStatus("idle");
  }

  useEffect(() => () => cleanupRef.current?.(), []);

  const message = {
    idle: "Ask Mia how to do anything in Acme Cloud.",
    connecting: "Connecting…",
    connected: "Connected to Mia.",
    error: error ?? "Failed to start session",
  }[status];

  return (
    <aside
      data-avatar-dock
      aria-label="Mia, your guide"
      className="fixed bottom-5 right-5 z-50 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
    >
      <p role="status" className="sr-only">{message}</p>
      <div className="relative aspect-[3/2] bg-zinc-900">
        <video
          id="avatar-video"
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        {status !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-zinc-300">
            {message}
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
