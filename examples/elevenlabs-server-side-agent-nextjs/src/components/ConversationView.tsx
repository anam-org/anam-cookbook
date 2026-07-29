/**
 * ConversationView — starts an Anam avatar session backed by an ElevenLabs
 * voice agent connected server-side through Anam.
 *
 * The client only deals with the Anam SDK — mic audio is captured over
 * WebRTC, and the avatar video + audio are streamed back. ElevenLabs
 * handles speech recognition, LLM reasoning, and text-to-speech.
 */
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { AnamEvent, createClient, type AnamClient } from "@anam-ai/js-sdk";

type Status = "idle" | "connecting" | "connected" | "error";

type Message = {
  id: string;
  role: "user" | "persona";
  content: string;
  interrupted?: boolean;
};

const CLIENT_TOOL_NAME = "show_notification";

type ToolActivity = {
  toolCallId: string;
  toolName: string;
  status: "ready" | "running" | "completed" | "failed";
  detail: string;
};

type DirectorNoteActivity = {
  cueTag: string;
  correlationId: string;
};

function readRequiredString(
  args: Record<string, unknown>,
  argumentName: string
) {
  const value = args[argumentName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`"${argumentName}" must be a non-empty string`);
  }

  return value.trim();
}

export default function ConversationView({
  personaName,
  avatarId,
  agentId,
}: {
  personaName: string;
  avatarId: string;
  agentId: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [toolActivity, setToolActivity] = useState<ToolActivity | null>(null);
  const [directorNoteActivity, setDirectorNoteActivity] =
    useState<DirectorNoteActivity | null>(null);

  const isConfigured = Boolean(avatarId && agentId);

  const anamClientRef = useRef<AnamClient | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const unregisterToolHandlersRef = useRef<Array<() => void>>([]);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const clearToolHandlers = useCallback(() => {
    unregisterToolHandlersRef.current.forEach((unregister) => unregister());
    unregisterToolHandlersRef.current = [];
  }, []);

  const clearNotificationTimer = useCallback(() => {
    if (notificationTimerRef.current !== null) {
      clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearToolHandlers();
      clearNotificationTimer();
      void anamClientRef.current?.stopStreaming();
    };
  }, [clearNotificationTimer, clearToolHandlers]);

  // Auto-scroll transcript to bottom when new messages arrive
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const start = useCallback(async () => {
    if (!isConfigured) {
      setError(
        "ANAM_AVATAR_ID and ELEVENLABS_AGENT_ID must be configured"
      );
      setStatus("error");
      return;
    }

    setStatus("connecting");
    setError(null);
    setMessages([]);
    setToolActivity(null);
    setDirectorNoteActivity(null);

    try {
      const res = await fetch("/api/anam-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarId, agentId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to get session token");
      }

      const { sessionToken } = await res.json();

      const anamClient = createClient(sessionToken);
      anamClientRef.current = anamClient;

      clearToolHandlers();
      unregisterToolHandlersRef.current = [
        anamClient.registerToolCallHandler(
          CLIENT_TOOL_NAME,
          {
            onStart: async (payload) => {
              setToolActivity({
                toolCallId: payload.toolCallId,
                toolName: payload.toolName,
                status: "running",
                detail: "Displaying the requested notification",
              });

              const message = readRequiredString(
                payload.arguments,
                "message"
              );

              clearNotificationTimer();
              setNotification(message);
              notificationTimerRef.current = setTimeout(() => {
                setNotification(null);
                notificationTimerRef.current = null;
              }, 8000);

              return `Displayed the notification: ${message}`;
            },
            onComplete: async (payload) => {
              setToolActivity({
                toolCallId: payload.toolCallId,
                toolName: payload.toolName,
                status: "completed",
                detail:
                  typeof payload.result === "string"
                    ? payload.result
                    : "Notification displayed",
              });
            },
            onFail: async (payload) => {
              setToolActivity({
                toolCallId: payload.toolCallId,
                toolName: payload.toolName,
                status: "failed",
                detail: payload.errorMessage,
              });
            },
          }
        ),
      ];

      setToolActivity({
        toolCallId: "waiting",
        toolName: "Client tool passthrough",
        status: "ready",
        detail:
          'Try saying "Show a notification that says hello".',
      });

      anamClient.addListener(
        AnamEvent.DIRECTOR_NOTE_CUE_APPLIED,
        (evt) => {
          setDirectorNoteActivity({
            cueTag: evt.cueTag,
            correlationId: evt.correlationId,
          });
        }
      );

      // Stream events fire on every chunk; accumulate into messages by id
      anamClient.addListener(
        AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
        (evt: {
          id: string;
          content: string;
          role: string;
          endOfSpeech: boolean;
          interrupted: boolean;
        }) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === evt.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                content: next[idx].content + evt.content,
                interrupted: evt.interrupted,
              };
              return next;
            }
            return [
              ...prev,
              {
                id: evt.id,
                role: evt.role as "user" | "persona",
                content: evt.content,
                interrupted: evt.interrupted,
              },
            ];
          });
        }
      );

      anamClient.addListener(AnamEvent.CONNECTION_CLOSED, () => {
        clearToolHandlers();
        anamClientRef.current = null;
        setStatus("idle");
      });

      await anamClient.streamToVideoElement("avatar-video");
      setStatus("connected");
    } catch (err) {
      console.error("Start error:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null
            ? JSON.stringify(err)
            : String(err);
      setError(message);
      setStatus("error");
      clearToolHandlers();
      anamClientRef.current = null;
    }
  }, [
    clearNotificationTimer,
    clearToolHandlers,
    avatarId,
    agentId,
    isConfigured,
  ]);

  const stop = useCallback(async () => {
    clearToolHandlers();
    try {
      await anamClientRef.current?.stopStreaming();
    } catch {}
    anamClientRef.current = null;
    setStatus("idle");
    setMessages([]); // Clear chat messages when conversation ends
  }, [clearToolHandlers]);


  return (
    <>
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl bg-black px-5 py-3 text-center text-sm font-medium text-white shadow-xl sm:top-8"
        >
          {notification}
        </div>
      )}

      {/* Contact Sales button - fades when session starts */}
      <div
        className="fixed top-4 right-4 sm:top-8 sm:right-8 z-10 transition-opacity duration-500 ease-out motion-reduce:transition-none"
        style={{
          opacity: status === "connecting" || status === "connected" ? 0 : 1,
          pointerEvents: status === "connecting" || status === "connected" ? "none" : "auto",
        }}
      >
        <a
          href="https://lab.anam.ai/login"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-black text-white hover:bg-gray transition-colors text-sm font-medium whitespace-nowrap"
          tabIndex={status === "connecting" || status === "connected" ? -1 : 0}
        >
          Sign Up
        </a>
      </div>

      {/* Heading - fades out when session starts */}
      <div
        className="flex flex-col items-center gap-0.5 sm:gap-2 text-center flex-shrink-0 transition-opacity duration-500 ease-out motion-reduce:transition-none mb-16"
        style={{
          opacity: status === "connecting" || status === "connected" ? 0 : 1,
          maxHeight: status === "connecting" || status === "connected" ? 0 : "200px",
          pointerEvents: status === "connecting" || status === "connected" ? "none" : "auto",
        }}
      >
        <p className="text-black text-[11px] sm:text-[32px] font-medium tracking-tight leading-tight sm:leading-[44px]">
          Add a face to your ElevenLabs Agent
        </p>
        <p className="text-black/70 text-[11px] sm:text-[32px] font-medium tracking-tight leading-tight sm:leading-[44px]">
          Expressive Voice Agents
        </p>
      </div>

      <div
        className={`w-full flex flex-col items-center transition-all duration-500 ease-out motion-reduce:transition-none flex-shrink min-h-0 ${
          status === "connecting" || status === "connected"
            ? "gap-1 sm:gap-2"
            : "gap-2 sm:gap-4"
        }`}
      >
      {/* Avatar video */}
      <div className="w-full flex justify-center items-center flex-shrink">
        <div className="relative w-full max-w-lg lg:max-w-xl">
          {/* Avatar video - centered */}
          <div
            className="relative w-full aspect-[720/480] rounded-2xl sm:rounded-[32px] overflow-hidden"
          >
            <video
              id="avatar-video"
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-black"
            />
            {status === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <span className="mb-16 text-sm font-medium text-white/70 sm:text-base">
                  {personaName}
                </span>
              </div>
            )}
            {status === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="font-medium">Connecting...</span>
                </div>
              </div>
            )}

            {/* Start button - show at bottom of video when idle */}
            {status === "idle" && (
              <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    start();
                  }}
                  className="pointer-events-auto min-w-[44px] min-h-[44px] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 hover:bg-white/30 touch-action-manipulation"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  aria-label="Start conversation"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                  </svg>
                </button>
              </div>
            )}

            {/* End button - show at bottom of video when connected */}
            {status === "connected" && (
              <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stop();
                  }}
                  className="pointer-events-auto min-w-[44px] min-h-[44px] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500/20 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 hover:bg-red-500/30 touch-action-manipulation"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  aria-label="End conversation"
                >
                  <svg
                    className="w-6 h-6 sm:w-7 sm:h-7 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 w-full max-w-lg lg:max-w-xl px-2">
        {status === "error" && error && (
          <span className="text-xs sm:text-sm text-accent px-4">Error: {error}</span>
        )}
      </div>

      {/* Visible feedback for testing forwarded ElevenLabs client tools */}
      {(status === "connected" || toolActivity) && (
        <div
          className="w-full max-w-lg lg:max-w-xl rounded-2xl bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  toolActivity?.status === "failed"
                    ? "bg-red-500"
                    : toolActivity?.status === "running"
                      ? "animate-pulse bg-amber-500"
                      : "bg-emerald-500"
                }`}
              />
              <span className="truncate text-xs font-semibold text-black sm:text-sm">
                {toolActivity?.toolName ?? "Client tools"}
              </span>
            </div>
            <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray sm:text-xs">
              {toolActivity?.status ?? "ready"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-black/65 sm:text-sm">
            {toolActivity?.detail ??
              "Waiting for an ElevenLabs client-tool call."}
          </p>
        </div>
      )}

      {/* Visible feedback for ElevenLabs v3 tags mapped to Director Notes */}
      {(status === "connected" || directorNoteActivity) && (
        <div
          className="w-full max-w-lg lg:max-w-xl rounded-2xl bg-white/85 px-4 py-3 shadow-sm backdrop-blur-sm"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  directorNoteActivity
                    ? "bg-violet-500"
                    : "animate-pulse bg-black/25"
                }`}
              />
              <span className="truncate text-xs font-semibold text-black sm:text-sm">
                Director Notes
              </span>
            </div>
            <span className="flex-shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray sm:text-xs">
              {directorNoteActivity ? "applied" : "waiting"}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-black/65 sm:text-sm">
            {directorNoteActivity
              ? `Applied [${directorNoteActivity.cueTag}] to the avatar.`
              : "Waiting for a supported ElevenLabs v3 expressive tag."}
          </p>
        </div>
      )}

      {/* Transcript - show only when connected */}
      {status === "connected" && (
        <div
          className="w-full max-w-lg lg:max-w-xl h-60 sm:h-64 rounded-2xl sm:rounded-[32px] bg-white overflow-hidden transition-all duration-700 ease-out motion-reduce:transition-none"
          style={{
            opacity: 1,
            transform: "translateY(0)",
          }}
        >
          {/* Transcript - scrollable area */}
          <div
            ref={transcriptRef}
            className="h-full overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 scroll-smooth"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1 ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <span className="text-[11px] sm:text-sm text-gray uppercase tracking-wide font-medium">
                  {msg.role === "user" ? "YOU" : "AGENT"}
                </span>
                <div
                  className={`max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-[16px] px-2.5 py-1.5 sm:px-4 sm:py-3 ${
                    msg.role === "user"
                      ? "bg-black text-white"
                      : "bg-gray-light text-black"
                  }`}
                >
                  <p
                    className={`text-[11px] sm:text-sm leading-relaxed ${
                      msg.interrupted ? "italic opacity-70" : ""
                    }`}
                  >
                    {msg.content}
                    {msg.interrupted && (
                      <span className="ml-2 text-[9px] sm:text-xs opacity-60">
                        (interrupted)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fork button at bottom center - fades when session starts */}
      <div
        className="fixed bottom-3 left-1/2 -translate-x-1/2 sm:bottom-6 z-10 transition-opacity duration-500 ease-out motion-reduce:transition-none"
        style={{
          opacity: status === "connecting" || status === "connected" ? 0 : 1,
          pointerEvents: status === "connecting" || status === "connected" ? "none" : "auto",
        }}
      >
        <a
          href="https://github.com/anam-org/anam-cookbook/tree/main/examples/elevenlabs-server-side-agent-nextjs"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white text-black hover:bg-black hover:text-white transition-colors text-sm font-medium whitespace-nowrap"
          tabIndex={status === "connecting" || status === "connected" ? -1 : 0}
        >
          View example code
        </a>
      </div>
    </div>
    </>
  );
}
