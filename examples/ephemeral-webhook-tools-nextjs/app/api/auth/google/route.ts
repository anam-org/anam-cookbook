import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createOAuthClient } from "@/lib/calendar";

export async function GET() {
  const oauth2Client = createOAuthClient();

  const state = randomBytes(32).toString("hex");

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });

  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
    secure: true,
  });
  return res;
}
