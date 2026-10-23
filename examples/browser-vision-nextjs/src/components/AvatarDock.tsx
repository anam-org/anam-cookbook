"use client";

import { useEffect, useRef, useState } from "react";
import { AnamEvent, ConnectionClosedCode, createClient } from "@anam-ai/js-sdk";
import type { AnamClient } from "@anam-ai/js-sdk";
import { giveBrowserVision } from "@/lib/browser-vision";

type Status = "idle" | "connecting" | "connected" | "error";

async function fetchSessionToken(): Promise<string> {
  const response = await fetch("/api/session-token", { method: "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to get session token");
  return data.sessionToken;
}

export function AvatarDock() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<AnamClient | null>(null);
  const stopVisionRef = useRef<(() => void) | null>(null);

  async function start() {
    setStatus("connecting");
    setError(null);
    try {
      const client = createClient(await fetchSessionToken());
      clientRef.current = client;

      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () =>
        setStatus("connected")
      );
      client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
        stopVisionRef.current?.();
        if (reason === ConnectionClosedCode.NORMAL) {
          setStatus("idle");
        } else {
          setError(details || `Connection closed: ${reason}`);
          setStatus("error");
        }
      });

      // The one line that gives the persona eyes on the page.
      stopVisionRef.current = giveBrowserVision(client, {
        skip: "[data-avatar-dock]",
      });

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setStatus("error");
    }
  }

  function stop() {
    stopVisionRef.current?.();
    clientRef.current?.stopStreaming();
    clientRef.current = null;
    setStatus("idle");
  }

  useEffect(() => {
    return () => {
      stopVisionRef.current?.();
      clientRef.current?.stopStreaming();
    };
  }, []);

  return (
    <aside
      data-avatar-dock
      aria-label="Mia, your guide"
      className="fixed bottom-5 right-5 z-50 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
    >
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
