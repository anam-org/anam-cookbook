"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, AnamEvent, type AnamClient } from "@anam-ai/js-sdk";
import { BookingsPanel } from "./_components/bookings-panel";

type Status =
  | "signed-out"
  | "idle"
  | "connecting"
  | "live"
  | "ended"
  | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const clientRef = useRef<AnamClient | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: { signedIn: boolean; email?: string }) => {
        if (!data.signedIn) setStatus("signed-out");
        else setEmail(data.email ?? null);
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.stopStreaming().catch(() => {});
      clientRef.current = null;
    };
  }, []);

  async function startSession() {
    setError(null);
    setStatus("connecting");

    try {
      const res = await fetch("/api/session-token", { method: "POST" });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`session-token: ${res.status} ${detail}`);
      }
      const { sessionToken } = (await res.json()) as { sessionToken: string };

      const client = createClient(sessionToken, {
        voiceDetection: { endOfSpeechSensitivity: 0.5 },
      });
      clientRef.current = client;

      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
        setStatus("live");
      });
      client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
        setStatus("ended");
      });
      client.addListener(AnamEvent.TOOL_CALL_COMPLETED, (payload) => {
        if (payload.toolName === "block_time") {
          setCalendarRefreshKey((k) => k + 1);
        }
      });

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  async function endSession() {
    await clientRef.current?.stopStreaming().catch(() => {});
    clientRef.current = null;
    setStatus("ended");
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="max-w-7xl mx-auto flex items-center justify-between px-6 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Calendar agent</h1>
        <nav className="flex items-center gap-4 text-sm">
          {email ? (
            <span className="text-zinc-500 text-xs">{email}</span>
          ) : null}
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-zinc-900 relative shadow-lg">
            <video
              id="avatar-video"
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {status !== "live" && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm">
                <StatusOverlay status={status} error={error} onStart={startSession} />
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            {status === "live" && (
              <button
                onClick={endSession}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500"
              >
                End session
              </button>
            )}
            {(status === "ended" || status === "error") && (
              <button
                onClick={startSession}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium"
              >
                Start new session
              </button>
            )}
          </div>

          <p className="mt-8 text-sm text-zinc-500 max-w-xl">
            Try: &ldquo;Block an hour of focus time tomorrow morning.&rdquo;
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-4">Bookings</h2>
          <BookingsPanel refreshKey={calendarRefreshKey} />
        </div>
      </section>
    </main>
  );
}

function StatusOverlay({
  status,
  error,
  onStart,
}: {
  status: Status;
  error: string | null;
  onStart: () => void;
}) {
  if (status === "signed-out") {
    return (
      <a
        href="/api/auth/google"
        className="px-5 py-3 rounded-lg bg-white text-zinc-900 text-sm font-medium shadow"
      >
        Sign in with Google
      </a>
    );
  }
  if (status === "idle") {
    return (
      <button
        onClick={onStart}
        className="px-5 py-3 rounded-lg bg-white text-zinc-900 text-sm font-medium shadow"
      >
        Start conversation
      </button>
    );
  }
  if (status === "connecting") {
    return <p className="text-white text-sm">Connecting to your avatar&hellip;</p>;
  }
  if (status === "ended") {
    return <p className="text-white text-sm">Session ended.</p>;
  }
  if (status === "error") {
    return (
      <div className="text-center px-6">
        <p className="text-red-300 text-sm mb-2">Something went wrong</p>
        {error && <p className="text-white/80 text-xs max-w-md">{error}</p>}
      </div>
    );
  }
  return null;
}
