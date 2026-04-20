import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/calendar";
import { saveTokenRecord } from "@/lib/tokenStore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.json(
      {
        error:
          "No refresh_token returned. Revoke access at https://myaccount.google.com/permissions and retry.",
      },
      { status: 400 },
    );
  }

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: profile } = await oauth2.userinfo.get();
  const email = profile.email ?? undefined;

  const userId = email ?? randomUUID();

  await saveTokenRecord({
    userId,
    email,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope ?? undefined,
    token_type: tokens.token_type ?? undefined,
  });

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("userId", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
