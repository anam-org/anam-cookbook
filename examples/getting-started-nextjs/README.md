# Getting Started with Anam AI - Next.js Example

A simple Next.js application that demonstrates how to integrate an Anam AI persona into your web application.

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

This example uses an **ephemeral persona** - the avatar configuration is defined entirely in code, so you don't need to create a persona in Anam Lab first.

### Session token generation (`src/app/api/session-token/route.ts`)

The API route generates a session token using your persona config. This keeps your API key private on the server.

### Avatar component (`src/components/AvatarPlayer.tsx`)

The component handles:
- Fetching a session token from the API route
- Creating an Anam client with `createClient(sessionToken)`
- Streaming the avatar video to a `<video>` element
- Listening for events (connection status, message updates)
- Sending text messages with `sendUserMessage()`

## Key SDK methods

- `createClient(sessionToken)` - Create a new Anam client
- `client.streamToVideoElement('video-id')` - Start streaming to a video element
- `client.addListener(AnamEvent.X, callback)` - Listen for events
- `client.sendUserMessage(text)` - Send a text message to the avatar
- `client.stopStreaming()` - End the session

## Learn more

- [Anam Documentation](https://docs.anam.ai)
- [JavaScript SDK Reference](https://docs.anam.ai/sdk/javascript)
