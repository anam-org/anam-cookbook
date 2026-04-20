import { NextRequest, NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/calendar";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("userId")?.value;
  if (!userId) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();

  try {
    const calendar = await getCalendarClient(userId);
    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (data.items ?? [])
      .filter((e) => e.start?.dateTime || e.start?.date)
      .map((e) => {
        const allDay = !e.start?.dateTime;
        return {
          id: e.id ?? "",
          title: e.summary ?? "(no title)",
          start: e.start?.dateTime ?? `${e.start?.date}T00:00:00`,
          end: e.end?.dateTime ?? `${e.end?.date}T00:00:00`,
          timezone: e.start?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          attendees:
            e.attendees?.map((a) => a.email).filter((x): x is string => !!x) ?? [],
          htmlLink: e.htmlLink ?? "",
          hangoutLink: e.hangoutLink ?? undefined,
          allDay,
        };
      });

    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
