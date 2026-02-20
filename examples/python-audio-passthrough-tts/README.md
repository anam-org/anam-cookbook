# Python audio passthrough with TTS

A script that connects to Anam with audio passthrough and sends TTS to the avatar. The avatar video is shown in an OpenCV window and audio plays through your speakers. Pass text on the command line; it is converted to speech via ElevenLabs and streamed to the avatar.
This demo script is not recommended for production use and only serves to highlight the mechanism to use Anam Avatars with the Python SDK.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (or pip)
- Anam API key from [lab.anam.ai](https://lab.anam.ai)
- ElevenLabs API key from [elevenlabs.io](https://elevenlabs.io)

## Setup

```bash
cd examples/python-audio-passthrough-tts
uv sync
cp .env.example .env
# Edit .env: ANAM_API_KEY, ELEVENLABS_API_KEY
```

## Usage

```bash
# Text → ElevenLabs TTS → Anam
uv run python main.py --text "Hello, this is a test"

# Custom voice
uv run python main.py --text "Hi" --voice YOUR_VOICE_ID
```

**Note:** On macOS you may see libavdevice duplicate class warnings (OpenCV + PyAV). The script still runs; press `q` in the video window to quit early.
