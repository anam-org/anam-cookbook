# Vision Agents + Anam dynamic background switching

This example extends the base Vision Agents Anam avatar pattern with a simple
chroma-key scene switcher.

What is added on top of the baseline:

- A custom `SceneAwareAnamAvatarPublisher` that replaces green-screen pixels.
- Automatic scene switching based on request intent:
  - recipe/cooking requests -> `kitchen`
  - weather requests -> `studio`
- A `provide_cooking_instructions` tool for recipe responses.
- A `get_weather` tool using the baseline Vision Agents weather helper.
- A turn-taking callback (`TurnStartedEvent`) that returns to the base scene when the user starts the next turn.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/)
- Stream API key and secret from [getstream.io](https://getstream.io/try-for-free/)
- Anam API key and avatar ID from [Anam Lab](https://lab.anam.ai)
- Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Deepgram API key from [Deepgram](https://deepgram.com/)

## Setup

```bash
cd examples/vision-agents-anam-dynamic-background
uv sync
cp .env.example .env
```

Fill in `.env`:

```bash
STREAM_API_KEY=...
STREAM_API_SECRET=...
GEMINI_API_KEY=...
DEEPGRAM_API_KEY=...
ANAM_API_KEY=...
ANAM_AVATAR_ID=...
```

Optional chroma-key tuning (useful if you see green spill/banding on edges):

```bash
ANAM_GREEN_THRESHOLD=88
ANAM_GREEN_BIAS=1.14
ANAM_GREEN_TOLERANCE=22
ANAM_GREEN_EDGE_EXPAND=1
```

## Run

```bash
uv run python main.py run
```

Open the Stream call URL printed in the terminal and join the room.

## Prompts to test

- "Give me quick cooking instructions for pasta."
- "What's the weather in Amsterdam?"
