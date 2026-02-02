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

  try {
    console.log("Generating session token for persona:", personaConfig);
    const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ personaConfig }),
    });

    console.log("Response:", response);

    if (!response.ok) {
      const error = await response.text();
      console.error("Anam API error:", error);
      return NextResponse.json(
        { error: "Failed to get session token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Data:", data);
    return NextResponse.json({ sessionToken: data.sessionToken });
  } catch (error) {
    console.error("Error fetching session token:", error);
    return NextResponse.json(
      { error: "Failed to get session token" },
      { status: 500 }
    );
  }
}
