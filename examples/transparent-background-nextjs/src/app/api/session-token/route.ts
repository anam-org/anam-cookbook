import { NextResponse } from "next/server";
import { buildPersonaConfig } from "@/config/persona";

export async function POST() {
  const apiKey = process.env.ANAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANAM_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let personaConfig;

  try {
    personaConfig = buildPersonaConfig();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Persona config is invalid",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ personaConfig }),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      console.error("Anam API error:", data);
      return NextResponse.json(
        { error: "Failed to get session token" },
        { status: response.status },
      );
    }

    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error) {
    console.error("Error fetching session token:", error);
    return NextResponse.json(
      { error: "Failed to get session token" },
      { status: 500 },
    );
  }
}
