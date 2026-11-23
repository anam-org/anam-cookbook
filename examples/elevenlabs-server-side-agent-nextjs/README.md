# Server-side ElevenLabs agent with an Anam avatar

This Next.js app pairs an ElevenLabs conversational agent with an Anam avatar. ElevenLabs handles speech recognition, LLM reasoning, and text-to-speech. Anam connects to the agent server-side, renders a real-time lip-synced avatar, and maps supported ElevenLabs v3 expressive tags to Director Notes.

> Read the [server-side ElevenLabs agents cookbook](https://anam.ai/cookbook/elevenlabs-server-side-agents) for a walkthrough.

This example was migrated from [anam-org/elevenlabs-agent](https://github.com/anam-org/elevenlabs-agent).

## Architecture

```
Client (Anam JS SDK) ──WebRTC──▶ Anam ◀──WebSocket──▶ ElevenLabs (STT → LLM → TTS)
       ▲                          │                           │
       └──── client tools ───────┴───────────────────────────┘
                                  │
                          Face generation
                                  │
                          WebRTC video/audio ──▶ Client
```

## How it works

1. When you click Start, the browser asks for the microphone and gets a single-use **start ticket** from a server action, signed with `SESSION_SECRET`. The Next.js API route (`/api/anam-session`) accepts a request only from the same origin, with a valid, unused ticket, and within the rate limits. It then fetches an ElevenLabs **signed URL** using your API key and requests an Anam **session token** with `elevenLabsAgentSettings` attached. The avatar and agent IDs come from server environment variables and never reach the browser.
2. The session token selects the Cara-4.1 Express avatar model and gives Director Notes a warm baseline style.
3. Anam uses the signed URL to open a WebSocket to ElevenLabs and manages the full voice pipeline.
4. Supported v3 tags in the agent response are mapped to Director Notes cues, so the face follows the voice's delivery.
5. The client creates an `AnamClient` with the session token and calls `streamToVideoElement()`. Microphone audio goes to Anam over WebRTC; the avatar video and speech audio come back over the same connection.
6. ElevenLabs client-tool calls travel through the same server-side connection. The Anam client runs the matching browser handler and sends its result back through Anam.
7. No ElevenLabs SDK is needed on the client. The only client dependency is `@anam-ai/js-sdk`.

## Setup

You need Node.js 20.9 or newer, an Anam API key, and an ElevenLabs account with a configured conversational agent.

### Configure an ElevenLabs agent

1. Go to [elevenlabs.io](https://elevenlabs.io) → **Agents** → **Create Agent**
2. Configure your agent's system prompt and personality
3. Under **Agent Voice**, select **V3 Conversational** as the TTS model (enables expressive mode)
4. Copy the **Agent ID**

### Enable Director Notes

> Director Notes only work with **Cara 4** avatars. `ANAM_AVATAR_ID` must reference an avatar that supports Cara-4.1 Express.

The API route sets `avatarModel` to `cara-4.1-express` and configures a warm baseline style at `0.5` expressivity:

```typescript
personaConfig: {
  avatarId: config.avatarId,
  avatarModel: "cara-4.1-express",
  directorNotes: {
    presetStyle: "warm",
    expressivity: 0.5,
  },
},
```

Tell the ElevenLabs agent to use expressive tags in its system prompt. For example:

```text
Use ElevenLabs v3 expressive tags sparingly when the delivery should change.
For testing, use tags such as [excited], [laughs], [whispers], [sighs],
[gasps], [angrily], [sarcastic], or [nervous].
Place each tag immediately before the words it should affect.
Do not explain or read the tags aloud.
```

The integration maps these ElevenLabs tags:

| Director Note cue | Recognized ElevenLabs v3 tags |
|---|---|
| `happy` | `[excited]`, `[happily]`, `[cheerfully]`, `[elated]` |
| `laughter` | `[laugh]`, `[laughs]`, `[laughing]`, `[laughs harder]`, `[starts laughing]`, `[chuckles]`, `[chuckling]`, `[giggles]`, `[giggling]` |
| `warm` | `[whispers]`, `[whispering]`, `[quietly]` |
| `playful` | `[sarcastic]`, `[playfully]` |
| `curious` | `[curiously]`, `[quizzical]`, `[quizzically]` |
| `concerned` | `[sigh]`, `[sighs]`, `[exhales]` |
| `sad` | `[sadly]`, `[sorrowful]`, `[tearful]`, `[crying]` |
| `surprised` | `[gasp]`, `[gasps]`, `[startled]` |
| `angry` | `[angrily]`, `[furious]`, `[intensely]` |
| `distressed` | `[nervous]`, `[fearful]`, `[scared]` |

This table is the complete alias list that Anam recognizes. ElevenLabs supports other audio tags, but Anam does not map them to Director Notes. Recognized tags are removed from the visible transcript. Other bracketed tags remain ordinary text.

The page listens for `DIRECTOR_NOTE_CUE_APPLIED` and shows the normalized cue, such as `laughter`, when the avatar applies it. See the [Anam Director Notes docs](https://anam.ai/docs/personas/director-notes) for cue configuration and the [ElevenLabs Expressive mode docs](https://elevenlabs.io/docs/eleven-agents/customization/voice/expressive-mode) for v3 voice behavior.

### Add the client tool

In the ElevenLabs agent dashboard, open **Tools**, add a tool with **Tool Type** set to **Client**, and enable **Wait for response**. ElevenLabs has a [client tools guide](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools) with screenshots of this setup.

Tool and parameter names are case-sensitive. Use these exact values:

| Tool | Description | Required parameter |
|---|---|---|
| `show_notification` | Show a notification in the demo page. | `message` (String): the notification text |

It also helps to add these instructions to the agent's system prompt:

```text
Use show_notification when the user asks to display a message on screen.
```

The handlers are registered in `src/components/ConversationView.tsx` before the Anam WebRTC session starts. Each handler validates the forwarded arguments, updates the browser UI, and returns a string to the ElevenLabs conversation. See the [Anam client tools docs](https://anam.ai/docs/personas/tools/client-tools) for the handler lifecycle.

### Choose an Anam avatar

1. Go to [lab.anam.ai](https://lab.anam.ai) → create an account
2. Copy your **API Key** from the API Keys page
3. Pick an **Avatar ID** that supports Cara-4.1 Express from the Avatars page

### Add environment variables

```bash
cp .env.example .env.local
```

Fill in the keys for one avatar-agent pair:

| Variable | Source |
|---|---|
| `ANAM_API_KEY` | lab.anam.ai → API Keys |
| `ANAM_AVATAR_ID` | lab.anam.ai → Avatars (must support Cara-4.1 Express) |
| `ELEVENLABS_API_KEY` | elevenlabs.io → API Keys |
| `ELEVENLABS_AGENT_ID` | elevenlabs.io → Agents dashboard |
| `SESSION_SECRET` | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PERSONA_NAME` | Optional label shown before the session starts |
| `APP_ORIGIN` | Your public origin, such as `https://example.com`. Optional locally; set it in production |

None of these use the `NEXT_PUBLIC_` prefix. The page sends `PERSONA_NAME` to the browser as a label, so don't put anything private in it. The others stay on the server.

### Protecting the session route

Every session uses minutes on your Anam account and your ElevenLabs agent, so `/api/anam-session` doesn't accept calls from anywhere:

- It rejects requests that a browser sent from another site. The request's `Origin`, including scheme and port, must match the site.
- It requires a start ticket signed with `SESSION_SECRET`. The browser gets one from a server action (`src/app/actions.ts`) just before each start; tickets work once, within two minutes.
- It limits starts to 6 per visitor in 10 minutes, 30 per visitor a day and 500 for the whole site a day (`src/lib/rate-limit.ts`). A visitor is an ID in an httpOnly cookie. A script can drop the cookie, so the site-wide cap is what bounds your spend. Tune the limits to your traffic.
- The session token it returns allows 3 session starts (the SDK's retries) and expires after 5 minutes.

The checks live in `src/lib/session-auth.ts` and `src/lib/rate-limit.ts`. Both import `server-only`, so the build fails if a client component imports them. These checks stop other websites from using the route from their visitors' browsers and cap what a script can spend. They aren't user authentication: a script can still get a ticket from the server action. In a real app, check your own user session in the route and rate-limit per user.

Used tickets and rate-limit counts are kept in memory. They reset on restart and aren't shared between instances. If you deploy several instances, move the counts to Redis or your database so the limits hold. A used ticket replayed on another instance only starts the one conversation a fresh ticket would, so the ticket record matters less.

#### Deploying

- Set `APP_ORIGIN` to your public origin in production. Without it, the route takes the expected origin from the request's own `Host` header, so any hostname that points at your server passes the check.
- If a proxy in front of the app rewrites the `Host` header and doesn't forward the public host in `X-Forwarded-Host`, Next.js rejects the server action before it runs. Add your public host to [`serverActions.allowedOrigins`](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions#allowedorigins) in `next.config.ts`, and set `APP_ORIGIN`.

The client component requests the microphone itself, so it can release a permission grant that arrives late. It removes its event listeners and tool handlers, cancels a start in progress, and calls `stopStreaming()` when the conversation ends, the connection closes, or the component unmounts, including when a start fails after Stop or unmount. The Stop button shows while connecting, so a start that hangs can be cancelled. The page shows the session as connected only once WebRTC connects, and shows an error if the connection closes abnormally.

### Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), click **Start**, grant mic permission, and speak.

To test the forwarded tool, try:

- `Show a notification that says the client tool worked.`

To test Director Notes, ask for a response that starts excited, becomes quiet, and ends with a laugh. The page displays the latest normalized Director Note cue alongside the client tool's lifecycle state.
