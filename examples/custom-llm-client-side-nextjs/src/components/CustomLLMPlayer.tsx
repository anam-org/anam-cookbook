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

async function streamLLMResponse(messages: Message[]): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to get LLM response");
  }

  return response.body;
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

export function CustomLLMPlayer() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const clientRef = useRef<AnamClient | null>(null);
  const lastProcessedUserMessageId = useRef<string | null>(null);

  const handleMessagesUpdated = useCallback(async (messages: Message[]) => {
    setMessages([...messages]);

    // Find the latest user message
    const latestUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!latestUserMessage) return;

    // Skip if we've already processed this message
    if (latestUserMessage.id === lastProcessedUserMessageId.current) return;
    lastProcessedUserMessageId.current = latestUserMessage.id;

    const client = clientRef.current;
    if (!client) return;

    setIsResponding(true);

    try {
      // Stream response from our LLM
      const responseStream = await streamLLMResponse(messages);
      const reader = responseStream.getReader();
      const decoder = new TextDecoder();

      // Create a talk stream to send chunks to the avatar
      const talkStream = client.createTalkMessageStream();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        await talkStream.streamMessageChunk(chunk, false);
      }

      await talkStream.endMessage();
    } catch (err) {
      console.error("Error getting LLM response:", err);
      setError("Failed to get response from LLM");
    } finally {
      setIsResponding(false);
    }
  }, []);

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
        onMessagesUpdated: handleMessagesUpdated,
      });

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setConnectionState("error");
    }
  }, [handleMessagesUpdated]);

  const stopSession = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopStreaming();
      clientRef.current = null;
    }
    setConnectionState("idle");
    setMessages([]);
    lastProcessedUserMessageId.current = null;
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
      {/* Video container */}
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
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isResponding && (
              <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                Thinking...
              </span>
            )}
            <button
              onClick={stopSession}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              End session
            </button>
          </div>
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
                  {msg.role === "user" ? "You" : "Assistant"}:
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
