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

  const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ personaConfig }),
  });

  if (!response.ok) {
    console.error("Anam API error:", await response.text());
    return NextResponse.json(
      { error: "Failed to get session token" },
      { status: response.status }
    );
  }

  const { sessionToken } = await response.json();
  return NextResponse.json({ sessionToken });
}
