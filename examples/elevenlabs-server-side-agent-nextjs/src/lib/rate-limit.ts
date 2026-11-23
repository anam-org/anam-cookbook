// Caps conversation starts per visitor and for the whole site. Every session
// uses minutes on your Anam account and your ElevenLabs agent, and the start
// ticket doesn't stop a script that asks for a fresh ticket each time.
//
// The counts live in memory, so they reset when the server restarts and
// aren't shared between instances. In production, keep them in Redis or your
// database and update them atomically. Tune the limits to your traffic.

import "server-only";

type Window = { limit: number; ms: number };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const PER_VISITOR: Window[] = [
  { limit: 6, ms: 10 * MINUTE },
  { limit: 30, ms: DAY },
];
const SITE_PER_DAY: Window[] = [{ limit: 500, ms: DAY }];

const counts = new Map<string, { count: number; expires: number }>();

export type Verdict = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Checks every window before counting anything, so a refused start stores
 * nothing and doesn't use up another window. Only accepted starts are
 * stored, so the site's daily cap also caps the size of the map.
 */
export function takeStartSlot(visitorId: string, now = Date.now()): Verdict {
  const windows = [
    ...PER_VISITOR.map((window) => ({ ...window, key: `visitor:${visitorId}` })),
    ...SITE_PER_DAY.map((window) => ({ ...window, key: "site" })),
  ].map(({ key, limit, ms }) => {
    const start = Math.floor(now / ms) * ms;
    const id = `${key}:${ms}:${start}`;
    return { id, limit, expires: start + ms, count: counts.get(id)?.count ?? 0 };
  });
  const full = windows.find((window) => window.count >= window.limit);
  if (full) {
    return { ok: false, retryAfterSeconds: Math.ceil((full.expires - now) / 1000) };
  }

  for (const [id, entry] of counts) if (entry.expires <= now) counts.delete(id);
  for (const window of windows) {
    counts.set(window.id, { count: window.count + 1, expires: window.expires });
  }
  return { ok: true };
}
