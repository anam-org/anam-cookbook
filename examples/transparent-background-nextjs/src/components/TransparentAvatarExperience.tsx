"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnamEvent,
  ConnectionClosedCode,
  createClient,
} from "@anam-ai/js-sdk";
import type {
  AnamClient,
  ClientToolEvent,
  Message,
} from "@anam-ai/js-sdk";
import {
  GreenScreenCanvas,
  type KeySettings,
} from "@/components/GreenScreenCanvas";

type ConnectionState = "idle" | "connecting" | "connected" | "error";
type SceneId = "homepage" | "studio" | "product";

const videoElementId = "anam-hidden-video";

const scenes: Record<
  SceneId,
  {
    label: string;
    title: string;
    subtitle: string;
    className: string;
    style?: React.CSSProperties;
  }
> = {
  homepage: {
    label: "Homepage",
    title: "Bring your product to life",
    subtitle: "A live avatar can sit inside the page instead of inside a box.",
    className: "scene-homepage",
    style: {
      backgroundImage:
        "linear-gradient(90deg, rgba(0,0,0,.66), rgba(0,0,0,.18)), url('/anam-homepage-background.jpg')",
    },
  },
  studio: {
    label: "Studio",
    title: "Drop into a live launch room",
    subtitle: "The same keyed stream can float over editorial or event pages.",
    className: "scene-studio",
  },
  product: {
    label: "Product",
    title: "Guide users through the interface",
    subtitle: "Client tools can change the page while the avatar keeps talking.",
    className: "scene-product",
  },
};

const defaultKeySettings: KeySettings = {
  minGreen: 36,
  greenBias: 0.96,
  softness: 28,
  spill: 0.45,
};

async function fetchSessionToken(): Promise<string> {
  const response = await fetch("/api/session-token", { method: "POST" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to get session token");
  }

  return data.sessionToken;
}

function isSceneId(value: unknown): value is SceneId {
  return value === "homepage" || value === "studio" || value === "product";
}

export function TransparentAvatarExperience() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneId>("homepage");
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<KeySettings>(defaultKeySettings);
  const clientRef = useRef<AnamClient | null>(null);

  const handleToolEvent = useCallback((event: ClientToolEvent) => {
    if (event.eventName !== "set_showcase_scene") return;

    const requestedScene = event.eventData.scene;
    if (isSceneId(requestedScene)) {
      setScene(requestedScene);
    }
  }, []);

  const startSession = useCallback(async () => {
    setConnectionState("connecting");
    setError(null);
    setMessages([]);

    try {
      const sessionToken = await fetchSessionToken();
      const client = createClient(sessionToken);
      clientRef.current = client;

      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
        setConnectionState("connected");
      });
      client.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, setMessages);
      client.addListener(AnamEvent.CLIENT_TOOL_EVENT_RECEIVED, handleToolEvent);
      client.addListener(AnamEvent.CONNECTION_CLOSED, (reason, details) => {
        if (reason === ConnectionClosedCode.NORMAL) {
          setConnectionState("idle");
          return;
        }

        setError(details || `Connection closed: ${reason}`);
        setConnectionState("error");
      });

      await client.streamToVideoElement(videoElementId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
      setConnectionState("error");
    }
  }, [handleToolEvent]);

  const stopSession = useCallback(() => {
    clientRef.current?.stopStreaming();
    clientRef.current = null;
    setConnectionState("idle");
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      clientRef.current?.stopStreaming();
    };
  }, []);

  const currentScene = scenes[scene];
  const isStreaming =
    connectionState === "connecting" || connectionState === "connected";

  return (
    <main
      className={`experience ${currentScene.className}`}
      style={currentScene.style}
    >
      <section className="hero-shell">
        <div className="hero-copy">
          <p className="eyebrow">Canvas chroma key</p>
          <h1>{currentScene.title}</h1>
          <p>{currentScene.subtitle}</p>

          <div className="actions">
            {connectionState === "connected" ? (
              <button className="button button-light" onClick={stopSession}>
                End session
              </button>
            ) : (
              <button
                className="button button-light"
                disabled={connectionState === "connecting"}
                onClick={startSession}
              >
                {connectionState === "connecting"
                  ? "Connecting..."
                  : "Start conversation"}
              </button>
            )}
            <button
              className="button button-dark"
              onClick={() => setScene("product")}
            >
              Product view
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
        </div>

        <div className="avatar-layer" aria-live="polite">
          <GreenScreenCanvas
            videoElementId={videoElementId}
            fallbackImageSrc="/greenscreen-david.jpg"
            isStreaming={isStreaming}
            settings={settings}
          />
          <video
            id={videoElementId}
            autoPlay
            playsInline
            className="hidden-video"
          />
        </div>
      </section>

      <aside className="control-dock" aria-label="Avatar controls">
        <div className="scene-switcher">
          {Object.entries(scenes).map(([id, item]) => (
            <button
              key={id}
              className={scene === id ? "scene-button active" : "scene-button"}
              onClick={() => setScene(id as SceneId)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="media-row">
          <Image
            src="/greenscreen-david.jpg"
            alt="Green-screen avatar source"
            width={72}
            height={48}
          />
          <div>
            <span>Source</span>
            <strong>Green-screen custom avatar</strong>
          </div>
        </div>

        <label className="range-control">
          <span>Key strength</span>
          <input
            type="range"
            min="28"
            max="120"
            value={settings.minGreen}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                minGreen: Number(event.target.value),
              }))
            }
          />
        </label>

        <label className="range-control">
          <span>Edge softness</span>
          <input
            type="range"
            min="18"
            max="90"
            value={settings.softness}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                softness: Number(event.target.value),
              }))
            }
          />
        </label>

        <div className="transcript">
          {messages.slice(-3).map((message) => (
            <p key={message.id}>
              <strong>{message.role === "user" ? "You" : "Avatar"}</strong>
              {message.content}
            </p>
          ))}
          {messages.length === 0 && <p>Say: change the background to studio.</p>}
        </div>
      </aside>
    </main>
  );
}
