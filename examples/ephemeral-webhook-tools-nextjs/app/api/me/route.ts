import { NextRequest, NextResponse } from "next/server";
import { getUserEmail, hasRefreshToken } from "@/lib/tokenStore";
import { verifyUserId } from "@/lib/sessionCookie";

export async function GET(req: NextRequest) {
  const rawCookie = req.cookies.get("userId")?.value;
  const userId = verifyUserId(rawCookie);
  if (!userId || !(await hasRefreshToken(userId))) {
    const res = NextResponse.json({ signedIn: false });
    if (rawCookie) res.cookies.delete("userId");
    return res;
  }
  const email = await getUserEmail(userId).catch(() => undefined);
  return NextResponse.json({ signedIn: true, userId, email });
}
