"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createClient,
  AnamEvent,
  ConnectionClosedCode,
} from "@anam-ai/js-sdk";
import type { AnamClient, ClientToolEvent } from "@anam-ai/js-sdk";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface AnamContextValue {
  connectionState: ConnectionState;
  error: string | null;
  lastToolCall: string | null;
  startSession: () => Promise<void>;
  stopSession: () => void;
}

const AnamContext = createContext<AnamContextValue | null>(null);

export function useAnam() {
  const context = useContext(AnamContext);
  if (!context) {
    throw new Error("useAnam must be used within an AnamProvider");
  }
  return context;
}

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

interface AnamProviderProps {
  children: ReactNode;
}

export function AnamProvider({ children }: AnamProviderProps) {
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

        if (!isValidPage(page)) {
          console.error("Invalid page:", page);
          return;
        }

        setLastToolCall(`Navigating to ${page}...`);

        // Navigate after a brief delay so the user sees the feedback
        setTimeout(() => {
          const path = page === "home" ? "/" : `/${page}`;
          router.push(path);
          // Clear the tool call message after navigation
          setTimeout(() => setLastToolCall(null), 1000);
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

      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
        setConnectionState("connected");
      });

      client.addListener(
        AnamEvent.CLIENT_TOOL_EVENT_RECEIVED,
        handleToolEvent
      );

      client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
        if (reason !== ConnectionClosedCode.NORMAL) {
          setError(details || `Connection closed: ${reason}`);
          setConnectionState("error");
        } else {
          setConnectionState("idle");
        }
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

  // Cleanup on unmount (only when the entire app unmounts, not on navigation)
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopStreaming();
      }
    };
  }, []);

  return (
    <AnamContext.Provider
      value={{
        connectionState,
        error,
        lastToolCall,
        startSession,
        stopSession,
      }}
    >
      {children}
    </AnamContext.Provider>
  );
}
