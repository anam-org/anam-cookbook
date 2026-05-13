"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AnamEvent,
  ConnectionClosedCode,
  MessageRole,
  createClient,
} from "@anam-ai/js-sdk";
import type { AnamClient, Message, MessageStreamEvent } from "@anam-ai/js-sdk";

type ConnectionState = "idle" | "connecting" | "connected" | "paused" | "error";
type TranscriptMessage = Pick<Message, "role" | "content"> &
  Partial<Pick<Message, "id" | "interrupted">>;

const MAX_RESUME_CONTEXT_MESSAGES = 24;

async function fetchSessionToken(): Promise<string> {
  const response = await fetch("/api/session-token", { method: "POST" });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to get session token");
  }
  const { sessionToken } = await response.json();
  return sessionToken;
}

function normalizeContent(content: string) {
  return content.trim().replace(/\s+/g, " ");
}

function buildResumeContext(messages: TranscriptMessage[]) {
  const transcript = messages
    .filter((message) => message.content.trim())
    .slice(-MAX_RESUME_CONTEXT_MESSAGES)
    .map((message, index) => {
      const speaker = message.role === MessageRole.USER ? "User" : "Assistant";
      return `${index + 1}. ${speaker}: ${message.content}`;
    })
    .join("\n");

  return [
    "System note: this is a resumed Anam session.",
    "Treat the transcript below as prior conversation with the same user.",
    "Use it to answer follow-up questions, but do not mention the session restart unless the user asks.",
    "",
    transcript || "No prior transcript was captured.",
  ].join("\n");
}

function injectResumeContext(client: AnamClient, context: string) {
  const contextClient = client as AnamClient & {
    addContext?: (context: string) => void | Promise<void>;
  };

  if (typeof contextClient.addContext === "function") {
    void contextClient.addContext(context);
    return;
  }

  client.sendUserMessage(`Note to AI: ${context}`);
}

function upsertMessage(
  messages: TranscriptMessage[],
  incoming: TranscriptMessage
) {
  const content = incoming.content.trim();
  if (!content) return messages;

  const nextMessage = {
    ...incoming,
    content,
  };

  const existingIndex = incoming.id
    ? messages.findIndex((message) => message.id === incoming.id)
    : messages.findIndex(
        (message) =>
          !message.id &&
          message.role === incoming.role &&
          normalizeContent(message.content) === normalizeContent(content)
      );

  if (existingIndex === -1) {
    return [...messages, nextMessage];
  }

  const nextMessages = [...messages];
  nextMessages[existingIndex] = {
    ...nextMessages[existingIndex],
    ...nextMessage,
  };

  return nextMessages;
}

export function PauseResumePlayer() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string>();
  const [textInput, setTextInput] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [lastResumeContext, setLastResumeContext] = useState("");

  const clientRef = useRef<AnamClient | null>(null);
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const pendingResumeContextRef = useRef("");
  const streamBuffersRef = useRef<Record<string, TranscriptMessage>>({});
  const localSessionNumberRef = useRef(0);
  const activeLocalSessionNumberRef = useRef(0);
  const localMessageNumberRef = useRef(0);

  const setTranscript = useCallback((nextMessages: TranscriptMessage[]) => {
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
  }, []);

  const appendTranscript = useCallback(
    (message: TranscriptMessage) => {
      setTranscript(upsertMessage(messagesRef.current, message));
    },
    [setTranscript]
  );

  const mergeTranscript = useCallback(
    (history: TranscriptMessage[]) => {
      let nextMessages = [...messagesRef.current];

      for (const item of history) {
        nextMessages = upsertMessage(nextMessages, item);
      }

      setTranscript(nextMessages);
    },
    [setTranscript]
  );

  const flushStreamBuffers = useCallback(() => {
    let nextMessages = [...messagesRef.current];

    for (const bufferedMessage of Object.values(streamBuffersRef.current)) {
      nextMessages = upsertMessage(nextMessages, bufferedMessage);
    }

    streamBuffersRef.current = {};
    setTranscript(nextMessages);
    setStreamingText(undefined);
  }, [setTranscript]);

  const stopCurrentClient = useCallback(async () => {
    const client = clientRef.current;
    clientRef.current = null;
    flushStreamBuffers();

    if (client?.isStreaming()) {
      await client.stopStreaming();
    }
  }, [flushStreamBuffers]);

  const handleMessageStreamEvent = useCallback(
    (event: MessageStreamEvent, localSessionNumber: number) => {
      const messageId = `${localSessionNumber}:${event.id}`;
      const previous = streamBuffersRef.current[messageId];
      const nextContent = `${previous?.content || ""}${event.content}`;

      streamBuffersRef.current[messageId] = {
        id: messageId,
        role: event.role,
        content: nextContent,
        interrupted: event.interrupted,
      };

      if (event.role === MessageRole.PERSONA) {
        setStreamingText(nextContent);
      }

      if (event.endOfSpeech) {
        appendTranscript(streamBuffersRef.current[messageId]);
        delete streamBuffersRef.current[messageId];

        if (event.role === MessageRole.PERSONA) {
          setStreamingText(undefined);
        }
      }
    },
    [appendTranscript]
  );

  const startSession = useCallback(async (resumeFrom?: TranscriptMessage[]) => {
    setConnectionState("connecting");
    setError(null);
    setStreamingText(undefined);
    streamBuffersRef.current = {};

    const localSessionNumber = localSessionNumberRef.current + 1;
    localSessionNumberRef.current = localSessionNumber;
    activeLocalSessionNumberRef.current = localSessionNumber;

    const resumeContext = resumeFrom?.length ? buildResumeContext(resumeFrom) : "";
    pendingResumeContextRef.current = resumeContext;
    setLastResumeContext(resumeContext);

    try {
      await stopCurrentClient();

      const sessionToken = await fetchSessionToken();
      const client = createClient(sessionToken);
      clientRef.current = client;

      client.addListener(AnamEvent.SESSION_READY, () => {
        setConnectionState("connected");
        setSessionCount((count) => count + 1);

        const context = pendingResumeContextRef.current;
        pendingResumeContextRef.current = "";

        if (context) {
          window.setTimeout(() => {
            if (!client.isStreaming()) return;
            injectResumeContext(client, context);
          }, 300);
        }
      });

      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, (history: Message[]) => {
        mergeTranscript(
          history.map((message) => ({
            ...message,
            id: `${localSessionNumber}:${message.id}`,
          }))
        );
        setStreamingText(undefined);
      });

      client.addListener(
        AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
        (event: MessageStreamEvent) => {
          handleMessageStreamEvent(event, localSessionNumber);
        }
      );

      client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
        if (clientRef.current !== client) return;

        if (reason !== ConnectionClosedCode.NORMAL) {
          setError(details || `Connection closed: ${reason}`);
          setConnectionState("error");
        } else {
          setConnectionState("idle");
        }
      });

      await client.streamToVideoElement("avatar-video");
    } catch (err) {
      clientRef.current = null;
      setError(err instanceof Error ? err.message : "Failed to start session");
      setConnectionState("error");
    }
  }, [handleMessageStreamEvent, mergeTranscript, stopCurrentClient]);

  const handleStart = useCallback(() => {
    streamBuffersRef.current = {};
    localSessionNumberRef.current = 0;
    activeLocalSessionNumberRef.current = 0;
    localMessageNumberRef.current = 0;
    setTranscript([]);
    setLastResumeContext("");
    void startSession();
  }, [setTranscript, startSession]);

  const handlePause = useCallback(async () => {
    try {
      await stopCurrentClient();
      setConnectionState("paused");
      setStreamingText(undefined);
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : "Failed to pause");
      setConnectionState("error");
    }
  }, [stopCurrentClient]);

  const handleResume = useCallback(() => {
    flushStreamBuffers();
    void startSession(messagesRef.current);
  }, [flushStreamBuffers, startSession]);

  const handleSendMessage = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const content = textInput.trim();
      const client = clientRef.current;
      if (!content || !client?.isStreaming()) return;

      localMessageNumberRef.current += 1;
      appendTranscript({
        id: `${activeLocalSessionNumberRef.current}:local-user:${localMessageNumberRef.current}`,
        role: MessageRole.USER,
        content,
      });
      client.sendUserMessage(content);
      setTextInput("");
    },
    [appendTranscript, textInput]
  );

  useEffect(() => {
    return () => {
      void stopCurrentClient();
    };
  }, [stopCurrentClient]);

  const isConnected = connectionState === "connected";
  const canPause = isConnected;
  const canResume = connectionState === "paused";
  const canStart = connectionState !== "connecting";

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
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
              onClick={handleStart}
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
              onClick={handleStart}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {connectionState === "paused" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/85 text-white">
            Session paused
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start over
        </button>
        <button
          onClick={() => void handlePause()}
          disabled={!canPause}
          className="rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pause
        </button>
        <button
          onClick={handleResume}
          disabled={!canResume}
          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Resume
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Session {sessionCount || "-"} - {connectionState}
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-3">
        <input
          value={textInput}
          onChange={(event) => setTextInput(event.target.value)}
          disabled={!isConnected}
          placeholder={
            isConnected ? "Send a user message" : "Start or resume to send text"
          }
          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isConnected || !textInput.trim()}
          className="rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <div className="h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        {messages.length === 0 && !streamingText ? (
          <p className="text-gray-500 text-sm">
            Start speaking or send a text message to build a transcript.
          </p>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div
                key={msg.id || `${msg.role}-${index}`}
                className={`text-sm ${
                  msg.role === MessageRole.USER ? "text-blue-700" : "text-gray-800"
                }`}
              >
                <span className="font-medium">
                  {msg.role === MessageRole.USER ? "You" : "Persona"}:
                </span>{" "}
                {msg.content}
              </div>
            ))}
            {streamingText && (
              <div className="text-sm text-gray-500">
                <span className="font-medium">Persona:</span> {streamingText}
              </div>
            )}
          </>
        )}
      </div>

      <details className="rounded-lg border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-600">
          Last injected resume context
        </summary>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-xs text-gray-700">
          {lastResumeContext || "No resume context injected yet."}
        </pre>
      </details>
    </div>
  );
}
