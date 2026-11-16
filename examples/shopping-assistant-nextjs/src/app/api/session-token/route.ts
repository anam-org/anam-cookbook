import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildGreeting, buildSystemPrompt, describePage, persona, tools } from "@/config/assistant";
import { takeCallSlot } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const apiKey = process.env.ANAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANAM_API_KEY is not configured" }, { status: 500 });
  }

  // A visitor is an ID in an httpOnly cookie. Someone who clears it gets a
  // new one, so the store-wide cap is what really bounds your spend.
  const jar = await cookies();
  let visitorId = jar.get("visitor")?.value;
  if (!visitorId) {
    visitorId = randomUUID();
    jar.set("visitor", visitorId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const verdict = takeCallSlot(visitorId);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "The assistant is busy. Please try again in a little while." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
  const page = describePage(path);

  try {
    const response = await fetch("https://api.anam.ai/v1/auth/session-token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        // One session per token, so a token copied out of the page can't
        // start a second call.
        maxSessions: 1,
        personaConfig: {
          ...persona,
          systemPrompt: buildSystemPrompt(page.text),
          initialMessage: buildGreeting(page.productTitle),
          tools,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.error("Anam API returned status", response.status, await response.text());
      return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
    }
    const { sessionToken } = await response.json();
    return NextResponse.json({ sessionToken });
  } catch {
    console.error("Anam session token request failed");
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
