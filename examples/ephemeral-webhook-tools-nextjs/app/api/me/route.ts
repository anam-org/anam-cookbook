import { NextRequest, NextResponse } from "next/server";
import { getUserEmail, hasRefreshToken } from "@/lib/tokenStore";
import { getSessionUserId, SESSION_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const userId = getSessionUserId(req);
  if (!userId || !(await hasRefreshToken(userId))) {
    const res = NextResponse.json({ signedIn: false });
    if (userId) res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  const email = await getUserEmail(userId).catch(() => undefined);
  return NextResponse.json({ signedIn: true, userId, email });
}
