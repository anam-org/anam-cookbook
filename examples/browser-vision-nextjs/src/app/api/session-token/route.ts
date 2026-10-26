import { NextResponse } from "next/server";
import { personaConfig } from "@/config/persona";

export async function POST() {
  const apiKey = process.env.ANAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANAM_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // Local demo only. Authenticate users and enforce usage limits before
  // exposing this endpoint publicly; each session uses your Anam account.
  try {
    const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ personaConfig }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.error("Anam API returned status", response.status);
      return NextResponse.json(
        { error: "Failed to get session token" },
        { status: response.status }
      );
    }

    const { sessionToken } = await response.json();
    if (typeof sessionToken !== "string" || !sessionToken) {
      throw new Error("Anam API returned no session token");
    }
    return NextResponse.json({ sessionToken });
  } catch {
    console.error("Anam session token request failed");
    return NextResponse.json(
      { error: "Failed to get session token" },
      { status: 500 }
    );
  }
}
