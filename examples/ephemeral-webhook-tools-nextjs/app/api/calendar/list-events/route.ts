import { NextRequest, NextResponse } from "next/server";
import { authenticateWebhook } from "@/lib/webhookAuth";
import { getCalendarClient } from "@/lib/calendar";

type ListEventsBody = {
  window_start?: string;
  window_end?: string;
  max_results?: number;
  timezone?: string;
};

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = authenticateWebhook(req, "/api/calendar/list-events");
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as ListEventsBody;

  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const timeMin = body.window_start ?? now.toISOString();
  const timeMax = body.window_end ?? weekFromNow.toISOString();
  const maxResults = Math.min(Math.max(body.max_results ?? 10, 1), 50);

  const calendar = await getCalendarClient(userId);
  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
    timeZone: body.timezone,
  });

  const events = (data.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? e.start?.date,
    end: e.end?.dateTime ?? e.end?.date,
    timezone: e.start?.timeZone ?? body.timezone,
    attendees:
      e.attendees?.map((a) => a.email).filter((x): x is string => !!x) ?? [],
    location: e.location ?? undefined,
    htmlLink: e.htmlLink ?? undefined,
    allDay: !e.start?.dateTime,
  }));

  return NextResponse.json({
    events,
    count: events.length,
    window_start: timeMin,
    window_end: timeMax,
  });
}
