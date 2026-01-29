# Client-Side Tools Demo

This example demonstrates how to use Anam's client-side tools to let an avatar control your application. The avatar can navigate between pages based on voice commands.

## Setup

1. Copy `.env.example` to `.env.local` and add your API key:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) and start a conversation. Try saying "Show me the pricing page" or "Take me to features".

## How it works

The example uses inline tools defined in `src/config/persona.ts`. When creating a session token, we include the tools directly in the persona configuration. This approach is simpler than pre-creating tools in Anam Lab because everything is defined in code.

The `navigate_to_page` tool is defined with an enum of valid pages. When the LLM decides to call this tool, the SDK emits a `CLIENT_TOOL_EVENT_RECEIVED` event that our component handles to navigate the user.
