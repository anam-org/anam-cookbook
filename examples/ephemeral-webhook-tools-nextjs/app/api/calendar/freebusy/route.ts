import { NextRequest, NextResponse } from "next/server";
import { authenticateWebhook } from "@/lib/webhookAuth";
import { getCalendarClient, computeFreeSlots } from "@/lib/calendar";

type FreeBusyBody = {
  window_start?: string;
  window_end?: string;
  duration_minutes?: number;
  timezone?: string;
};

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = authenticateWebhook(req, "/api/calendar/freebusy");
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as FreeBusyBody;
  const { window_start, window_end, duration_minutes, timezone } = body;

  if (!window_start || !window_end || typeof duration_minutes !== "number") {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const calendar = await getCalendarClient(userId);
  const { data } = await calendar.freebusy.query({
    requestBody: {
      timeMin: window_start,
      timeMax: window_end,
      timeZone: timezone,
      items: [{ id: "primary" }],
    },
  });

  const busy: { start: string; end: string }[] = [];
  for (const entry of Object.values(data.calendars ?? {})) {
    for (const b of entry.busy ?? []) {
      if (b.start && b.end) busy.push({ start: b.start, end: b.end });
    }
  }

  const slots = computeFreeSlots(window_start, window_end, busy, duration_minutes);

  return NextResponse.json({ slots });
}
