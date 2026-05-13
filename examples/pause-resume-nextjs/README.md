# Simulated Pause / Resume with Anam - Next.js Example

A small Next.js application that simulates pause and resume for a turnkey Anam session.

Pause ends the current stream. Resume creates a new Anam session token, starts a fresh client, and injects the transcript from the previous session as context so the persona can answer follow-up questions naturally.

The approach is framework-agnostic: store the transcript somewhere in your client application, stop the active stream on pause, and start a new Anam session with the old transcript injected as context on resume. This example uses React and Next.js.

Important limitation: this simulates conversational continuity, not Anam session continuity. Each resume creates a distinct Anam session, so Lab session views, recordings, transcripts, reports, API reads, and `client.getActiveSessionId()` will reflect the new underlying session.

## Prerequisites

- Node.js 18+ installed
- An Anam account with API access ([sign up at lab.anam.ai](https://lab.anam.ai))

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and add your API key:

```bash
cp .env.example .env.local
```

Get your API key from [Anam Lab](https://lab.anam.ai) and add it to `.env.local`.

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Customizing your persona

Edit `src/config/persona.ts` to customize your avatar:

```typescript
export const personaConfig = {
  // Avatar appearance - the visual character
  avatarId: "edf6fdcb-acab-44b8-b974-ded72665ee26",

  // Voice - how the avatar sounds
  voiceId: "6bfbe25a-979d-40f3-a92b-5394170af54b",

  // LLM - the AI model powering conversations
  llmId: "0934d97d-0c3a-4f33-91b0-5e136a0ef466",

  // System prompt - defines personality and behavior
  systemPrompt: `You are a friendly AI assistant.`,
};
```

Browse available avatars and voices at [Anam Lab](https://lab.anam.ai).

## How it works

### Session token generation (`src/app/api/session-token/route.ts`)

The API route generates a session token using your persona config. This keeps your API key private on the server.

### Avatar component (`src/components/PauseResumePlayer.tsx`)

The component handles:
- Fetching a session token from the API route
- Creating an Anam client with `createClient(sessionToken)`
- Streaming the avatar video to a `<video>` element
- Listening for events (connection status, message updates)
- Sending text messages with `sendUserMessage()`
- Capturing transcript messages across sessions
- Calling `stopStreaming()` when the user pauses
- Creating a new session and calling `addContext()` with the old transcript when the user resumes

## Key SDK methods

- `createClient(sessionToken)` - Create a new Anam client
- `client.streamToVideoElement('video-id')` - Start streaming to a video element
- `client.addListener(AnamEvent.X, callback)` - Listen for events
- `client.sendUserMessage(text)` - Send a text message to the avatar
- `client.addContext(text)` - Add prior transcript context to a resumed turnkey session
- `client.stopStreaming()` - End the session

## Notes

This is a client-side workaround, not a true transport-level pause. Resuming starts a new session, so the user may see a fresh connection and greeting. Anam Lab and API resources remain scoped to each underlying session, so keep your own app-level conversation ID if you need to stitch multiple resumed sessions together. For client-managed LLM modes, the same pattern is simpler because your own app already owns the message history; pass that history to your LLM when creating the new response stream.

## Learn more

- [Anam Documentation](https://anam.ai/docs/overview)
- [JavaScript SDK Reference](https://anam.ai/docs/javascript-sdk/reference/basic-usage)
