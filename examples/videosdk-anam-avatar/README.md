# VideoSDK AI agents with Anam avatars

This example shows how to add Anam lip-synced avatars to VideoSDK AI voice agents. It includes both pipeline types:

- **RealTimePipeline** (`realtime_agent.py`) - Uses Gemini Live for low-latency, native audio
- **CascadingPipeline** (`cascading_agent.py`) - Uses Deepgram (STT), OpenAI (LLM), ElevenLabs (TTS)

The cascading version shows clearly how all different pipeline components are sequenced and can be configured independently. 
The RealTimePipeline uses an "all-in-one" approach and has a tool-calling example as well.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- API keys: VideoSDK auth token, Anam, and for your chosen pipeline (Gemini, or Deepgram + OpenAI + ElevenLabs)

## Setup

```bash
git clone https://github.com/anam-org/anam-cookbook.git
cd anam-cookbook
cd examples/videosdk-anam-avatar
uv sync
cp .env.example .env
```

Edit `.env` with your credentials.

## Run

**RealTime (Gemini):**
```bash
uv run python realtime_agent.py
```

**Cascading (Deepgram + OpenAI + ElevenLabs):**
```bash
uv run python cascading_agent.py
```

When you run the agent, a **playground URL** is printed in the terminal. Open that URL in your browser to join the room and see the avatar. The agent auto-creates a room when `room_id` is omitted. To join a specific room instead, set `room_id` in `RoomOptions` and create the room first via the [Create Room API](https://docs.videosdk.live/api-reference/realtime-communication/create-room).

## See also

- [VideoSDK Anam plugin docs](https://docs.videosdk.live/ai_agents/plugins/avatar/anam-ai)
- [Anam AI docs](https://anam.ai/docs)
- [Cookbook recipe](../../content/recipes/videosdk-anam-avatar.mdx)
