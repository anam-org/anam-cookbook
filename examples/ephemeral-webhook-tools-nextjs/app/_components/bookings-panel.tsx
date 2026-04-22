"use client";

import { useEffect, useMemo, useState } from "react";

export type Booking = {
  id: string;
  title: string;
  start: string;
  end: string;
  timezone: string;
  attendees: string[];
  htmlLink: string;
  hangoutLink?: string;
  allDay?: boolean;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHourMinute(iso: string, timezone: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

export function BookingsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState<0 | 1>(0);

  useEffect(() => {
    fetch("/api/events")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data: { events: Booking[] }) => setBookings(data.events))
      .catch((err) => setError((err as Error).message));
  }, [refreshKey]);

  const { thisMonth, nextMonth, rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const nextMonth = addMonths(thisMonth, 1);
    return {
      thisMonth,
      nextMonth,
      rangeStart: thisMonth,
      rangeEnd: endOfMonth(nextMonth),
    };
  }, []);

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    if (!bookings) return map;
    for (const b of bookings) {
      const d = new Date(b.start);
      if (d < rangeStart || d > rangeEnd) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    }
    return map;
  }, [bookings, rangeStart, rangeEnd]);

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!bookings && !error && (
        <p className="text-sm text-zinc-500">Loading&hellip;</p>
      )}

      {bookings && (
        <div>
          <MonthSwitcher
            monthOffset={monthOffset}
            onChange={setMonthOffset}
            thisMonth={thisMonth}
            nextMonth={nextMonth}
          />
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${monthOffset * 100}%)` }}
            >
              <div className="w-full flex-shrink-0">
                <MonthCalendar
                  monthStart={thisMonth}
                  bookingsByDay={bookingsByDay}
                />
              </div>
              <div className="w-full flex-shrink-0">
                <MonthCalendar
                  monthStart={nextMonth}
                  bookingsByDay={bookingsByDay}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthSwitcher({
  monthOffset,
  onChange,
  thisMonth,
  nextMonth,
}: {
  monthOffset: 0 | 1;
  onChange: (o: 0 | 1) => void;
  thisMonth: Date;
  nextMonth: Date;
}) {
  const current = monthOffset === 0 ? thisMonth : nextMonth;
  const label = current.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="flex items-center justify-between mb-3">
      <button
        onClick={() => onChange(0)}
        disabled={monthOffset === 0}
        aria-label="Previous month"
        className="w-8 h-8 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ‹
      </button>
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
        <div className="flex gap-1.5">
          {[0, 1].map((i) => (
            <button
              key={i}
              onClick={() => onChange(i as 0 | 1)}
              aria-label={`Go to month ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                monthOffset === i
                  ? "bg-zinc-900 dark:bg-white"
                  : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
      <button
        onClick={() => onChange(1)}
        disabled={monthOffset === 1}
        aria-label="Next month"
        className="w-8 h-8 rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}

function MonthCalendar({
  monthStart,
  bookingsByDay,
}: {
  monthStart: Date;
  bookingsByDay: Map<string, Booking[]>;
}) {
  const today = new Date();

  // Build 6x7 grid starting from the Monday on/before the 1st.
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7; // 0 = Mon
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstDayOfWeek);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  return (
    <div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="grid grid-cols-7 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const inMonth = date.getMonth() === monthStart.getMonth();
            const isToday = sameDay(date, today);
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const dayBookings = bookingsByDay.get(key) ?? [];

            return (
              <div
                key={i}
                className={`min-h-[76px] border-r border-b border-zinc-200 dark:border-zinc-800 p-1.5 ${
                  i % 7 === 6 ? "border-r-0" : ""
                } ${i >= 35 ? "border-b-0" : ""} ${
                  inMonth
                    ? "bg-white dark:bg-zinc-900"
                    : "bg-zinc-50 dark:bg-zinc-950 text-zinc-400 dark:text-zinc-600"
                }`}
              >
                <div
                  className={`text-xs font-medium mb-1 ${
                    isToday
                      ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : ""
                  }`}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 2).map((b) => {
                    const timeLabel = b.allDay
                      ? "All day"
                      : formatHourMinute(b.start, b.timezone);
                    return (
                      <a
                        key={b.id}
                        href={b.htmlLink || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${b.title} · ${timeLabel}`}
                        className="block truncate text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900"
                      >
                        {b.allDay ? "" : `${timeLabel} `}
                        {b.title}
                      </a>
                    );
                  })}
                  {dayBookings.length > 2 && (
                    <div className="text-[10px] text-zinc-500 px-1.5">
                      +{dayBookings.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

