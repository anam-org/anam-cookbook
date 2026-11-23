import { NextResponse } from "next/server";
import {
  isSameOrigin,
  readServerConfig,
  redeemStartTicket,
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
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Start the conversation from this site." },
      { status: 403 }
    );
  }

  const config = readServerConfig();
  if (!config) {
    return NextResponse.json(
      { error: "The server is missing settings. See .env.example." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!redeemStartTicket(body?.ticket)) {
    return NextResponse.json(
      { error: "Couldn't verify this request. Try again." },
      { status: 401 }
    );
  }

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
      // The token can start one session (the SDK retries up to 3 times) and
      // expires after 5 minutes, so a copied token is of little use.
      maxSessions: 3,
      expiresInSeconds: 300,
      personaConfig: {
        avatarId: config.avatarId,
        avatarModel: "cara-4",
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
