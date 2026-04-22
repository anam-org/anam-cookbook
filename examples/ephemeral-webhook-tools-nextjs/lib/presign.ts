import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.PRESIGN_SECRET;
  if (!s) throw new Error("PRESIGN_SECRET not set");
  return s;
}

export function presignUrl(
  baseUrl: string,
  userId: string,
  expiresInSeconds = 3600,
  exp?: number,
): string {
  const expTs = exp ?? Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${baseUrl}|${userId}|${expTs}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${baseUrl}?uid=${encodeURIComponent(userId)}&exp=${expTs}&sig=${sig}`;
}

export function verifyPresignedUrl(
  baseUrl: string,
  uid: string | null,
  exp: string | null,
  sig: string | null,
): string {
  if (!uid || !exp || !sig) throw new Error("Missing presign params");
  if (Math.floor(Date.now() / 1000) > Number(exp)) throw new Error("URL expired");

  const payload = `${baseUrl}|${uid}|${exp}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");

  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) throw new Error("Invalid signature");
  if (!timingSafeEqual(sigBuf, expBuf)) throw new Error("Invalid signature");

  return uid;
}
