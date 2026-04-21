import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.PRESIGN_SECRET;
  if (!s) throw new Error("PRESIGN_SECRET not set");
  return s;
}

export function signUserId(userId: string): string {
  const sig = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifyUserId(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = value.slice(0, dot);
  const sig = value.slice(dot + 1);

  const expected = createHmac("sha256", secret()).update(userId).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;
  return userId;
}
