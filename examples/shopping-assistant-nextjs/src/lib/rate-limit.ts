// The session-token endpoint is public, and every session uses minutes on
// your Anam account. These limits cap calls per visitor and for the whole
// store. The counts live in memory, so they reset when the server restarts
// and aren't shared between instances: keep them in Redis or your database
// in production.

type Window = { limit: number; ms: number };

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export const PER_VISITOR: Window[] = [
  { limit: 6, ms: 10 * MINUTE },
  { limit: 30, ms: DAY },
];
export const STORE_PER_DAY: Window[] = [{ limit: 500, ms: DAY }];

const counts = new Map<string, { count: number; expires: number }>();

export type Verdict = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Counts one request in each fixed window and stops at the first that's full. */
function check(key: string, windows: Window[], now: number): Verdict {
  for (const window of windows) {
    const start = Math.floor(now / window.ms) * window.ms;
    const id = `${key}:${window.ms}:${start}`;
    const count = (counts.get(id)?.count ?? 0) + 1;
    counts.set(id, { count, expires: start + window.ms });
    if (count > window.limit) {
      return { ok: false, retryAfterSeconds: Math.ceil((start + window.ms - now) / 1000) };
    }
  }
  return { ok: true };
}

/** The visitor's limits first, so one busy visitor doesn't use up the store's calls. */
export function takeCallSlot(visitorId: string, now = Date.now()): Verdict {
  for (const [id, entry] of counts) if (entry.expires <= now) counts.delete(id);
  const visitor = check(`visitor:${visitorId}`, PER_VISITOR, now);
  if (!visitor.ok) return visitor;
  return check("store", STORE_PER_DAY, now);
}
