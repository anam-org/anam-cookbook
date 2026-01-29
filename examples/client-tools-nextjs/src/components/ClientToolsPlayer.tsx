"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createClient,
  AnamEvent,
  ConnectionClosedCode,
} from "@anam-ai/js-sdk";
import type { AnamClient, ClientToolEvent } from "@anam-ai/js-sdk";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

const VALID_PAGES = ["home", "pricing", "features", "contact"] as const;
type ValidPage = (typeof VALID_PAGES)[number];

function isValidPage(page: string): page is ValidPage {
  return VALID_PAGES.includes(page as ValidPage);
}

async function fetchSessionToken(): Promise<string> {
  const response = await fetch("/api/session-token", { method: "POST" });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to get session token");
  }
  const { sessionToken } = await response.json();
  return sessionToken;
}

function setupEventListeners(
  client: AnamClient,
  handlers: {
    onConnected: () => void;
    onDisconnected: () => void;
    onError: (message: string) => void;
    onToolEvent: (event: ClientToolEvent) => void;
  }
) {
  client.addListener(AnamEvent.CONNECTION_ESTABLISHED, handlers.onConnected);

  client.addListener(AnamEvent.CLIENT_TOOL_EVENT_RECEIVED, handlers.onToolEvent);

  client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
    if (reason !== ConnectionClosedCode.NORMAL) {
      handlers.onError(details || `Connection closed: ${reason}`);
    } else {
      handlers.onDisconnected();
    }
  });
}

export function ClientToolsPlayer() {
  const router = useRouter();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const clientRef = useRef<AnamClient | null>(null);

  const handleToolEvent = useCallback(
    (event: ClientToolEvent) => {
      const { eventName, eventData } = event;

      if (eventName === "navigate_to_page") {
        const page = eventData.page as string;

        // Validate against whitelist
        if (!isValidPage(page)) {
          console.error("Invalid page:", page);
          return;
        }

        setLastToolCall(`Navigating to ${page}...`);

        // Navigate after a brief delay so the user sees the feedback
        setTimeout(() => {
          const path = page === "home" ? "/" : `/${page}`;
          router.push(path);
        }, 500);
      }
    },
    [router]
  );

  const startSession = useCallback(async () => {
    setConnectionState("connecting");
    setError(null);
    setLastToolCall(null);

    try {
      const sessionToken = await fetchSessionToken();
      const client = createClient(sessionToken);
      clientRef.current = client;

      setupEventListeners(client, {
        onConnected: () => setConnectionState("connected"),
        onDisconnected: () => setConnectionState("idle"),
        onError: (message) => {
          setError(message);
          setConnectionState("error");
        },
        onToolEvent: handleToolEvent,
      });

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setConnectionState("error");
    }
  }, [handleToolEvent]);

  const stopSession = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopStreaming();
      clientRef.current = null;
    }
    setConnectionState("idle");
    setLastToolCall(null);
  }, []);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopStreaming();
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      <div className="relative aspect-[3/2] bg-black rounded-lg overflow-hidden">
        <video
          id="avatar-video"
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {connectionState === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <button
              onClick={startSession}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start conversation
            </button>
          </div>
        )}

        {connectionState === "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white">Connecting...</div>
          </div>
        )}

        {connectionState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-4">
            <div className="text-red-400">{error}</div>
            <button
              onClick={startSession}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {connectionState === "connected" && (
          <button
            onClick={stopSession}
            className="absolute top-4 right-4 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            End session
          </button>
        )}
      </div>

      {lastToolCall && (
        <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm">
          {lastToolCall}
        </div>
      )}

      {connectionState === "connected" && (
        <p className="text-gray-600 text-sm text-center">
          Try saying &quot;Show me the pricing page&quot; or &quot;Take me to
          features&quot;
        </p>
      )}
    </div>
  );
}
