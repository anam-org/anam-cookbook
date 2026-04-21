import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

function secret(): string {
  const s = process.env.PRESIGN_SECRET;
  if (!s) throw new Error("PRESIGN_SECRET not set");
  return s;
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

export function createSignedSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function verifySignedSession(cookie: string): string | null {
  const dotIndex = cookie.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const userId = cookie.slice(0, dotIndex);
  const sig = cookie.slice(dotIndex + 1);

  if (!userId || !sig) return null;

  const expected = sign(userId);

  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  return userId;
}

export const SESSION_COOKIE = "session";

export function getSessionUserId(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  return verifySignedSession(cookie);
}
