import { NextRequest, NextResponse } from "next/server";
import { buildPersonaConfig } from "@/lib/personaConfig";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const apiKey = process.env.ANAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANAM_API_KEY not set" }, { status: 500 });
  }

  const personaConfig = buildPersonaConfig(userId);

  const res = await fetch("https://api.anam.ai/v1/auth/session-token", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ personaConfig }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "session-token request failed", detail: text },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json({ sessionToken: data.sessionToken });
}
