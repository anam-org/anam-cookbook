import { presignUrl } from "./presign";

const buildSystemPrompt = () => `You are Alex, a scheduling assistant. You help the user see what's on their calendar and block out time for themselves.

Today is ${new Date().toDateString()}. When the user refers to days like "Friday" or "next week", resolve them relative to today.

Output format:
- Everything you say will be spoken aloud by a text-to-speech engine. Output only words that should be spoken.
- No markdown, no lists, no bullet points, no headings, no code blocks, no emoji, no parentheticals, no stage directions.
- Use only sentence-level punctuation: periods, commas, and question marks. Avoid semicolons, colons, dashes, and ellipses.
- Never read out ISO timestamps, URLs, IDs, or raw JSON. Convert times to natural speech like "Tuesday at 2pm".

Rules:
- If the user asks about their own schedule ("what's on my calendar", "what's next", "read me my week"), call list_events.
- If the user asks when they're free ("when am I free Thursday afternoon", "find me an hour tomorrow"), call find_free_time.
- Use block_time to create self-only calendar holds ("block an hour tomorrow morning", "put focus time in my calendar Friday"). Never invite other people.
- Never call block_time without explicit verbal confirmation of the title, date, time, and timezone.
- Offer at most 3 slot options per turn.
- After creating a hold, end with a short spoken summary like "I've blocked focus time for Tuesday at 2pm".
- Before calling a tool, respond to the user so they are aware of what is being done. For example, "Let me check your calendar for next week and see what's coming up" before calling list_events, or "Okay, I'm looking for an open 2 hour slot on Thursday afternoon" before calling find_free_time.`;

const FIND_FREE_TIME_PARAMS = {
  type: "object",
  properties: {
    window_start: { type: "string", description: "ISO 8601 start of search window" },
    window_end: { type: "string", description: "ISO 8601 end of search window" },
    duration_minutes: {
      type: "number",
      description: "Required block length in minutes",
    },
    timezone: {
      type: "string",
      description: "IANA timezone for interpreting the window (e.g. Europe/London)",
    },
  },
  required: ["window_start", "window_end", "duration_minutes"],
} as const;

const LIST_EVENTS_PARAMS = {
  type: "object",
  properties: {
    window_start: {
      type: "string",
      description: "ISO 8601 start of the window. Defaults to now.",
    },
    window_end: {
      type: "string",
      description: "ISO 8601 end of the window. Defaults to 7 days from now.",
    },
    max_results: {
      type: "number",
      description: "Maximum number of events to return (1-50). Defaults to 10.",
    },
    timezone: {
      type: "string",
      description: "IANA timezone for interpreting the window (e.g. Europe/London)",
    },
  },
  required: [],
} as const;

const BLOCK_TIME_PARAMS = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short label for the block, e.g. 'Focus time'" },
    start: { type: "string", description: "ISO 8601 datetime" },
    end: { type: "string", description: "ISO 8601 datetime" },
    timezone: { type: "string", description: "IANA timezone string" },
    notes: { type: "string", description: "Optional description for the event" },
  },
  required: ["title", "start", "end", "timezone"],
} as const;

export function buildPersonaConfig(userId: string, expiresInSeconds = 3600) {
  const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) throw new Error("PUBLIC_BASE_URL not set");

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const freebusyUrl = presignUrl(`${base}/api/calendar/freebusy`, userId, expiresInSeconds, exp);
  const eventsUrl = presignUrl(`${base}/api/calendar/events`, userId, expiresInSeconds, exp);
  const listEventsUrl = presignUrl(`${base}/api/calendar/list-events`, userId, expiresInSeconds, exp);

  return {
    name: "Alex",
    avatarId: process.env.ANAM_AVATAR_ID,
    voiceId: process.env.ANAM_VOICE_ID,
    llmId: process.env.ANAM_LLM_ID,
    systemPrompt: buildSystemPrompt(),
    tools: [
      {
        type: "server",
        subtype: "webhook",
        name: "list_events",
        description:
          "Fetch the user's own upcoming calendar events. Call when the user asks what's on their calendar or to summarise their schedule.",
        url: listEventsUrl,
        method: "POST",
        parameters: LIST_EVENTS_PARAMS,
        awaitResponse: true,
        disableInterruptions: true,
      },
      {
        type: "server",
        subtype: "webhook",
        name: "find_free_time",
        description:
          "Find open slots on the user's own calendar of at least `duration_minutes`. Call before offering times to block out.",
        url: freebusyUrl,
        method: "POST",
        parameters: FIND_FREE_TIME_PARAMS,
        awaitResponse: true,
        disableInterruptions: true,
      },
      {
        type: "server",
        subtype: "webhook",
        name: "block_time",
        description:
          "Create a self-only calendar event (no attendees) to block out time for the user. Only call after they have explicitly confirmed title, time, and date.",
        url: eventsUrl,
        method: "POST",
        parameters: BLOCK_TIME_PARAMS,
        awaitResponse: true,
        disableInterruptions: true,
      },
    ],
  };
}
