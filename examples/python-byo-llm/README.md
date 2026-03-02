# Python BYO LLM: Anam TTS and avatar

You run your own LLM; Anam handles TTS and avatar in a single pipeline. Send your LLM's output via `send_talk_stream()`—Anam converts it to speech and renders the avatar.

**Key:** `llm_id="CUSTOMER_CLIENT_V1"` disables Anam's LLM in the orchestration layer. You provide the text; Anam does TTS + avatar only.

**Key:** Use `on_talk_stream_interrupted` callback to end the current turn, flush the remaining text in the buffer/response and create a new talk_message_stream.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/)
- Anam API key from [lab.anam.ai](https://lab.anam.ai)
- Avatar and voice IDs from [lab.anam.ai](https://lab.anam.ai)

## Setup

```bash
cd examples/python-byo-llm
uv sync
cp .env.example .env
```

Edit `.env`:
```bash
ANAM_API_KEY=your_key
ANAM_AVATAR_ID=your_avatar_id
ANAM_VOICE_ID=your_voice_id
```

## Usage

```bash
uv run python main.py /path/to/llm_output_chunks.txt
uv run python main.py  # uses default file: llm_output_sample.txt
```

Press `i` in the window to interrupt the current turn, `q` in the video window to quit early.
