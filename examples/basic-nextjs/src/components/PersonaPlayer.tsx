"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createClient,
  AnamEvent,
  ConnectionClosedCode,
} from "@anam-ai/js-sdk";
import type { AnamClient, Message } from "@anam-ai/js-sdk";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

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
    onMessagesUpdated: (messages: Message[]) => void;
  }
) {
  client.addListener(AnamEvent.CONNECTION_ESTABLISHED, handlers.onConnected);

  client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, handlers.onMessagesUpdated);

  client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
    if (reason !== ConnectionClosedCode.NORMAL) {
      handlers.onError(details || `Connection closed: ${reason}`);
    } else {
      handlers.onDisconnected();
    }
  });
}

export function PersonaPlayer() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const clientRef = useRef<AnamClient | null>(null);

  const startSession = useCallback(async () => {
    setConnectionState("connecting");
    setError(null);

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
        onMessagesUpdated: setMessages,
      });

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setConnectionState("error");
    }
  }, []);

  const stopSession = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopStreaming();
      clientRef.current = null;
    }
    setConnectionState("idle");
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopStreaming();
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Video container - 3:2 aspect ratio (720x480) */}
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

      {/* Conversation history */}
      {connectionState === "connected" && (
        <div className="h-48 overflow-y-auto bg-white rounded-lg border p-4 space-y-3">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Start speaking to have a conversation...
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm ${
                  msg.role === "user" ? "text-blue-700" : "text-gray-800"
                }`}
              >
                <span className="font-medium">
                  {msg.role === "user" ? "You" : "Persona"}:
                </span>{" "}
                {msg.content}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
