// Server-only helpers that protect /api/anam-session. The "server-only"
// import makes the build fail if a client component imports this file, because
// it reads SESSION_SECRET.
//
// The route accepts a request only when it comes from this site (same-origin
// check) and carries a start ticket signed with SESSION_SECRET. The browser
// gets a fresh ticket from a server action just before each start.
// These checks stop other websites from starting sessions from their
// visitors' browsers. They aren't user authentication: a script can still
// request a ticket, so the route also rate-limits starts (see rate-limit.ts).
// In a real app, also check your own user session in the route.

import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TICKET_TTL_MS = 2 * 60 * 1000;

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
export function isSameOrigin(request: Request, appOrigin: string | null) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");
  return origin !== null && origin === (appOrigin ?? originFromHost(request));
}

// Without APP_ORIGIN, the expected origin comes from the request's own Host
// header, so any hostname that reaches the server passes. That's fine for
// local development. In production, set APP_ORIGIN to your public origin.
function originFromHost(request: Request) {
  const host = request.headers.get("host");
  if (!host) return null;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    new URL(request.url).protocol.replace(":", "");
  return `${protocol}://${host}`;
}

const REQUIRED_SETTINGS = [
  "ANAM_API_KEY",
  "ELEVENLABS_API_KEY",
  "ANAM_AVATAR_ID",
  "ELEVENLABS_AGENT_ID",
  "SESSION_SECRET",
];

/**
 * Reads the server-only settings. Returns null, and logs why, if any are
 * missing or invalid.
 */
export function readServerConfig() {
  const env = process.env;
  const missing = REQUIRED_SETTINGS.filter((name) => !env[name]);
  if (missing.length > 0) {
    console.error(`Missing settings: ${missing.join(", ")}. See .env.example.`);
    return null;
  }
  if (env.SESSION_SECRET!.length < 32) {
    console.error("SESSION_SECRET must be at least 32 characters.");
    return null;
  }
  if (env.APP_ORIGIN && !isOrigin(env.APP_ORIGIN)) {
    console.error("APP_ORIGIN must be an origin such as https://example.com.");
    return null;
  }

  return {
    anamApiKey: env.ANAM_API_KEY!,
    elevenLabsApiKey: env.ELEVENLABS_API_KEY!,
    avatarId: env.ANAM_AVATAR_ID!,
    agentId: env.ELEVENLABS_AGENT_ID!,
    appOrigin: env.APP_ORIGIN ? new URL(env.APP_ORIGIN).origin : null,
  };
}

// True for a bare http(s) origin such as https://example.com, with no path.
function isOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      value.replace(/\/$/, "") === url.origin
    );
  } catch {
    return false;
  }
}
