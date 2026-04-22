import { google, calendar_v3 } from "googleapis";
import { getRefreshToken } from "./tokenStore";

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
  const oauth2Client = createOAuthClient();
  const refreshToken = await getRefreshToken(userId);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

type BusyInterval = { start: string; end: string };
type Slot = { start: string; end: string };

export function computeFreeSlots(
  windowStart: string,
  windowEnd: string,
  busy: BusyInterval[],
  durationMinutes: number,
  maxSlots = 5,
): Slot[] {
  const winStart = new Date(windowStart).getTime();
  const winEnd = new Date(windowEnd).getTime();
  const durMs = durationMinutes * 60 * 1000;

  const intervals = busy
    .map((b) => ({
      start: Math.max(new Date(b.start).getTime(), winStart),
      end: Math.min(new Date(b.end).getTime(), winEnd),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const iv of intervals) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }

  const slots: Slot[] = [];
  let cursor = winStart;
  for (const iv of merged) {
    if (iv.start - cursor >= durMs) {
      slots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(cursor + durMs).toISOString(),
      });
      if (slots.length >= maxSlots) return slots;
    }
    cursor = Math.max(cursor, iv.end);
  }
  if (winEnd - cursor >= durMs && slots.length < maxSlots) {
    slots.push({
      start: new Date(cursor).toISOString(),
      end: new Date(cursor + durMs).toISOString(),
    });
  }
  return slots;
}
