# Custom LLM with Anam (client-side)

This example demonstrates a client-side integration for using your own language model with Anam. Anam handles speech-to-text, text-to-speech, and avatar rendering while you provide the conversation logic.

## How it works

1. User speaks → Anam transcribes to text
2. Your LLM processes the text and generates a response
3. Response is streamed to Anam → Avatar speaks it

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` with your API keys:

```bash
ANAM_API_KEY=your_anam_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Key files

- `src/config/persona.ts` - Persona config with `llmId: "CUSTOMER_CLIENT_V1"` to enable custom LLM mode
- `src/app/api/chat/route.ts` - API route that streams responses from OpenAI
- `src/components/CustomLLMPlayer.tsx` - Main component handling the conversation flow

## Adapting for other LLMs

The `/api/chat` route uses OpenAI, but you can swap in any LLM:

- Anthropic Claude
- Google Gemini
- Self-hosted models (Ollama, vLLM, etc.)
- Any API that can stream text responses

Just modify `src/app/api/chat/route.ts` to call your preferred provider.
