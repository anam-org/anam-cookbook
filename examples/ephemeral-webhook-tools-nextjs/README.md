# Ephemeral Webhook Tools Example 

A voice agent built on [Anam](https://anam.ai) that reads your Google Calendar and blocks out time for you. Conversations happen with a real-time avatar in the browser; tool calls run server-to-server through HMAC-signed webhook URLs minted at session-token time.

This is the example app for the **Ephemeral webhook tools with per-session signed URLs** cookbook — see [`../cookbook.md`](../cookbook.md) for the full walkthrough of the pattern.

## What it does

- `list_events` — read upcoming events from your Google Calendar
- `find_free_time` — find open slots of a given duration
- `block_time` — create a self-only calendar hold (no attendees)

## Setup

1. Copy `.env.example` to `.env.local` and fill in:
   - **Anam** — get an API key at [lab.anam.ai](https://lab.anam.ai); fetch avatar/voice/LLM IDs as shown in the cookbook
   - **Google OAuth** — create a Web application client at [console.cloud.google.com](https://console.cloud.google.com/apis/credentials), enable the Google Calendar API, add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI, and request the `userinfo.email` and `calendar.events` scopes
   - **`PRESIGN_SECRET`** — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - **`PUBLIC_BASE_URL`** — must be a URL Anam can reach (see below)

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

3. Visit `/api/auth/google` to sign in with Google, then `/` to start a conversation.

## Local tunneling

Anam invokes webhooks server-to-server, so `localhost` won't work as `PUBLIC_BASE_URL`. Use a tunnel:

```bash
ngrok http 3000              # or: cloudflared tunnel, tailscale funnel
```

Then set the `PUBLIC_BASE_URL` to the tunnel URL, for the `GOOGLE_REDIRECT_URI` set this to localhost e.g. http://localhost:3000/api/auth/google/callback and add the same callback URL to your Google Cloud OAuth client's authorized redirect URIs.

A fixed subdomain (paid ngrok, named cloudflared tunnels) avoids re-updating these values on every restart.

## Architecture

- `app/api/session-token` — mints an Anam session token with an ephemeral persona; bakes signed tool URLs into the persona config
- `app/api/calendar/*` — webhook handlers Anam calls during the conversation; each verifies the signed URL before touching Google
- `app/api/events` — cookie-authenticated endpoint for the calendar UI to fetch the user's events
- `lib/presign.ts` — HMAC sign/verify
- `lib/personaConfig.ts` — the inline persona definition

## Notes

The token store (`lib/tokenStore.ts`) writes refresh tokens to a JSON file under `.data/` for development. Replace with a real database before deploying — see the **Security properties** section of the cookbook.
