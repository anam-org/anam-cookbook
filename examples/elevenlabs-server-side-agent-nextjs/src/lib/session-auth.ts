// Server-only helpers that protect /api/anam-session. Don't import this file
// from a client component: it reads SESSION_SECRET.
//
// The route accepts a request only when it comes from this site (same-origin
// check) and carries a start ticket that the page signed with SESSION_SECRET.
// Without them, any website or script could call the route and start sessions
// on your Anam and ElevenLabs accounts. This isn't user authentication: in a
// real app, also check your own user session in the route and rate-limit it.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TICKET_TTL_MS = 15 * 60 * 1000;

// Redeemed ticket nonces, so each ticket starts one conversation. The map
// lives in memory, so it resets on restart and isn't shared between server
// instances. Keep it in Redis or your database if you run several instances.
const redeemed = new Map<string, number>();

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Signs a ticket that lets the browser start one conversation. */
export function createStartTicket(now = Date.now()) {
  const payload = `${now + TICKET_TTL_MS}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

/** Checks a ticket's signature and expiry, and accepts each ticket once. */
export function redeemStartTicket(ticket: unknown, now = Date.now()) {
  if (typeof ticket !== "string" || ticket.length > 200) return false;

  const [expiresAt, nonce, signature, ...rest] = ticket.split(".");
  if (!expiresAt || !nonce || !signature || rest.length > 0) return false;

  const expected = Buffer.from(sign(`${expiresAt}.${nonce}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return false;
  }

  const expiry = Number(expiresAt);
  if (!Number.isSafeInteger(expiry) || expiry <= now) return false;

  for (const [key, keyExpiry] of redeemed) {
    if (keyExpiry <= now) redeemed.delete(key);
  }
  if (redeemed.has(nonce)) return false;
  redeemed.set(nonce, expiry);
  return true;
}

/**
 * Accepts only requests sent by a page on this site. Browsers always send
 * Origin on a POST from fetch(), and other sites can't change it.
 */
export function isSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads the server-only settings. Returns null if any are missing. */
export function readServerConfig() {
  const config = {
    anamApiKey: process.env.ANAM_API_KEY,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
    avatarId: process.env.ANAM_AVATAR_ID,
    agentId: process.env.ELEVENLABS_AGENT_ID,
    sessionSecret: process.env.SESSION_SECRET,
  };
  const complete = Object.values(config).every(Boolean);
  if (!complete || config.sessionSecret!.length < 32) return null;
  return config as { [K in keyof typeof config]: string };
}
