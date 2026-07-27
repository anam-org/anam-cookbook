import { NextResponse } from "next/server";

/**
 * Creates an Anam session token with ElevenLabs agent settings.
 *
 * Fetches the ElevenLabs signed URL server-side, then passes it to
 * the Anam session token API via environment.elevenLabsAgentSettings.
 * Anam handles the ElevenLabs connection, while the client only
 * streams the avatar.
 */
export async function POST(request: Request) {
  const anamApiKey = process.env.ANAM_API_KEY;
  if (!anamApiKey) {
    return NextResponse.json(
      { error: "ANAM_API_KEY must be set" },
      { status: 500 }
    );
  }

  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsApiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY must be set" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { avatarId, agentId } = body;

  if (!avatarId) {
    return NextResponse.json(
      { error: "avatarId is required" },
      { status: 400 }
    );
  }
  if (!agentId) {
    return NextResponse.json(
      { error: "agentId is required" },
      { status: 400 }
    );
  }

  // Fetch the ElevenLabs signed URL.
  const elRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    {
      headers: { "xi-api-key": elevenLabsApiKey },
    }
  );

  if (!elRes.ok) {
    const text = await elRes.text();
    return NextResponse.json(
      { error: `ElevenLabs API error: ${elRes.status} ${text}` },
      { status: elRes.status }
    );
  }

  const { signed_url: signedUrl } = await elRes.json();

  // Create an Anam session token with the ElevenLabs agent settings.
  const sessionTokenBody = {
    personaConfig: {
      avatarId,
      avatarModel: "cara-4",
      directorNotes: {
        presetStyle: "warm",
        expressivity: 0.5,
      },
    },
    environment: {
      elevenLabsAgentSettings: {
        signedUrl,
        agentId,
      },
    },
  };
  const anamRes = await fetch("https://api.anam.ai/v1/auth/session-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anamApiKey}`,
    },
    body: JSON.stringify(sessionTokenBody),
  });

  if (!anamRes.ok) {
    const text = await anamRes.text();
    return NextResponse.json(
      { error: `Anam API error: ${anamRes.status} ${text}` },
      { status: anamRes.status }
    );
  }

  const data = await anamRes.json();
  return NextResponse.json({ sessionToken: data.sessionToken });
}
