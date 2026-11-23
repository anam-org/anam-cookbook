import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { takeStartSlot } from "@/lib/rate-limit";
import {
  checkStartTicket,
  isSameOrigin,
  readServerConfig,
  spendStartTicket,
} from "@/lib/session-auth";

/**
 * Creates an Anam session token with ElevenLabs agent settings.
 *
 * Fetches the ElevenLabs signed URL server-side, then passes it to
 * the Anam session token API via environment.elevenLabsAgentSettings.
 * Anam handles the ElevenLabs connection, while the client only
 * streams the avatar.
 *
 * The avatar and agent IDs come from server environment variables, not
 * from the request, so a caller can't point your API keys at other agents.
 */
export async function POST(request: Request) {
  const config = readServerConfig();
  if (!config) {
    return NextResponse.json(
      { error: "The server settings are missing or invalid. See .env.example." },
      { status: 500 }
    );
  }

  if (!isSameOrigin(request, config.appOrigin)) {
    return NextResponse.json(
      { error: "Start the conversation from this site." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);

  // A visitor is an ID in an httpOnly cookie. A script that drops the cookie
  // gets a new ID each time, so the site-wide cap is what bounds the number
  // of starts.
  const jar = await cookies();
  let visitorId = jar.get("visitor")?.value;
  if (!visitorId) {
    visitorId = randomUUID();
    jar.set("visitor", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Check the ticket, take a rate-limit slot and spend the ticket with no
  // await in between, so a ticket can't be used twice and refused requests
  // aren't stored.
  const ticket = checkStartTicket(body?.ticket);
  if (!ticket) {
    return NextResponse.json(
      { error: "Couldn't verify this request. Try again." },
      { status: 401 }
    );
  }
  const verdict = takeStartSlot(visitorId);
  if (!verdict.ok) {
    // A wait of more than 10 minutes means a daily limit is full.
    const error =
      verdict.retryAfterSeconds > 600
        ? "This demo has reached its conversation limit for today."
        : "Please wait a few minutes before starting another conversation.";
    return NextResponse.json(
      { error },
      {
        status: 429,
        headers: { "Retry-After": String(verdict.retryAfterSeconds) },
      }
    );
  }
  spendStartTicket(ticket);

  try {
    // Fetch the ElevenLabs signed URL.
    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(config.agentId)}`,
      {
        headers: { "xi-api-key": config.elevenLabsApiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!elRes.ok) {
      console.error("ElevenLabs API error:", elRes.status, await elRes.text());
      return NextResponse.json(
        { error: "Couldn't connect to the ElevenLabs agent." },
        { status: 502 }
      );
    }

    const { signed_url: signedUrl } = await elRes.json();

    // Create an Anam session token with the ElevenLabs agent settings.
    const sessionTokenBody = {
      // The token allows 3 session starts, because the SDK retries a failed
      // start up to 3 times, and must be used within 5 minutes. To cap how
      // long each session runs, add maxSessionLengthSeconds to personaConfig.
      maxSessions: 3,
      expiresInSeconds: 300,
      personaConfig: {
        avatarId: config.avatarId,
        avatarModel: "cara-4.1-express",
        directorNotes: {
          presetStyle: "warm",
          expressivity: 0.5,
        },
      },
      environment: {
        elevenLabsAgentSettings: {
          signedUrl,
          agentId: config.agentId,
        },
      },
    };
    const anamRes = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.anamApiKey}`,
      },
      body: JSON.stringify(sessionTokenBody),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!anamRes.ok) {
      console.error("Anam API error:", anamRes.status, await anamRes.text());
      return NextResponse.json(
        { error: "Couldn't create the Anam session." },
        { status: 502 }
      );
    }

    const data = await anamRes.json();
    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error) {
    console.error("Session setup failed:", error);
    return NextResponse.json(
      { error: "Couldn't start the session. Try again." },
      { status: 502 }
    );
  }
}
