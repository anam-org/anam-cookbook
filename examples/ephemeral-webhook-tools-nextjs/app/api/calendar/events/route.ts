import { NextRequest, NextResponse } from "next/server";
import { authenticateWebhook } from "@/lib/webhookAuth";
import { getCalendarClient } from "@/lib/calendar";

type BlockTimeBody = {
  title?: string;
  start?: string;
  end?: string;
  timezone?: string;
  notes?: string;
};

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = authenticateWebhook(req, "/api/calendar/events");
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as BlockTimeBody;
  const { title, start, end, timezone, notes } = body;

  if (!title || !start || !end || !timezone) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const calendar = await getCalendarClient(userId);
  const { data: event } = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: title,
      description: notes,
      start: { dateTime: start, timeZone: timezone },
      end: { dateTime: end, timeZone: timezone },
      transparency: "opaque",
    },
  });

  if (!event.id || !event.htmlLink) {
    return NextResponse.json({ error: "event creation failed" }, { status: 502 });
  }

  return NextResponse.json({
    eventId: event.id,
    htmlLink: event.htmlLink,
  });
}
