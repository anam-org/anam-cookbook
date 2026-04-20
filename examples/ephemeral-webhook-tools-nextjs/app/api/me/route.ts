import { NextRequest, NextResponse } from "next/server";
import { getUserEmail, hasRefreshToken } from "@/lib/tokenStore";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("userId")?.value;
  if (!userId || !(await hasRefreshToken(userId))) {
    const res = NextResponse.json({ signedIn: false });
    if (userId) res.cookies.delete("userId");
    return res;
  }
  const email = await getUserEmail(userId).catch(() => undefined);
  return NextResponse.json({ signedIn: true, userId, email });
}
