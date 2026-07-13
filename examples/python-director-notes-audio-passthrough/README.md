# Audio passthrough with Director Notes cues

Type a line of text and the Anam avatar speaks it. [Cartesia](https://cartesia.ai) Sonic 3.5 synthesises the audio; Anam runs **face generation only** (audio passthrough). The `[tags]` you write drive both the voice and the face:

- **Voice** — Cartesia's own reading of the text (Sonic interprets emotional subtext), with `[laughter]` kept inline so the voice actually laughs.
- **Face** — each tag is sent as an Anam **Director Notes cue** over the WebRTC data channel, timed to the spoken word using Cartesia's word-level timestamps.

The passthrough stream uses 24 kHz / `pcm_s16le` / mono, matching Anam's suggested sample rate for best performance.

This is a demo script to highlight the mechanism — it is not production code.

## Prerequisites

- Python 3.10+ and [uv](https://docs.astral.sh/uv/) (or pip)
- An Anam API key from [lab.anam.ai](https://lab.anam.ai)
- A Cartesia API key from [cartesia.ai](https://cartesia.ai)
- **A cara-4 avatar.** Director Notes are ignored on older avatar models — set `ANAM_AVATAR_MODEL=cara-4` and pick a cara-4 avatar in [lab.anam.ai/avatars](https://lab.anam.ai/avatars).
- **`anam` ≥ 0.7.0a1.** `send_director_note_cue` only exists in the 0.7 alpha line, so this project installs a prerelease.

## Setup

```bash
cd examples/python-director-notes-audio-passthrough
uv sync --prerelease=allow
cp .env.example .env
# Edit .env: ANAM_API_KEY, CARTESIA_API_KEY (and a cara-4 ANAM_AVATAR_ID)
```

## Usage

```bash
# Interactive: type lines; the avatar speaks each one
uv run python main.py

# One-shot
uv run python main.py --text "[warm] Come closer. [surprised] Wait — what was that? [laughter] Oh, it's nothing."
```

The avatar video shows in an OpenCV window (press `q` to quit); its audio plays through your speakers. In interactive mode, type a blank line to quit.

**Sample lines to paste:**

```text
[happy] Great to see you! [curious] So what are we building today?
[concerned] That doesn't look right. [supportive] Don't worry, we'll fix it together.
[playful] Guess what? [surprised] We shipped it! [laughter] I can't believe it worked.
```

## Available tags

`[happy] [warm] [playful] [curious] [supportive] [concerned] [sad] [surprised] [angry] [distressed] [laughter]`

A known tag applies from where it appears until the next known tag. Unknown tags are spoken as normal text and emit no cue.

## How it works

1. `parse_tagged_line()` splits your line into segments at each known `[tag]`.
2. `_stream_turn()` opens one Cartesia websocket context with `add_timestamps=True` and pushes each segment's text. Cartesia streams audio chunks and word timestamps back interleaved.
3. As chunks arrive they're forwarded to `session.create_agent_audio_input_stream()` for lip-sync; as word timestamps arrive, `CueTimer` emits each face cue and it's sent with `session.send_director_note_cue(tag, at_seconds=...)` — so the face lands on the word and the avatar starts speaking almost immediately.
4. Cartesia's client is synchronous, so `_stream_turn` runs in a worker thread and bridges each async Anam send back to the event loop with `asyncio.run_coroutine_threadsafe(...)`.

## Key files

- `cues.py` — tag parsing and streaming cue-timing (`CueTimer`; `anchor_cues` is a one-shot wrapper). Run `uv run python cues.py` for its self-check.
- `main.py` — connect, the streaming type→TTS→passthrough→cues turn, and video/audio playback.

## Key SDK methods

| Method | Purpose |
| --- | --- |
| `PersonaConfig(avatar_model="cara-4", enable_audio_passthrough=True, director_notes=DirectorNotes(...))` | Enable passthrough + a baseline performance style |
| `session.create_agent_audio_input_stream(AgentAudioInputConfig(encoding="pcm_s16le", sample_rate=24000, channels=1))` | Open the passthrough audio stream |
| `agent.send_audio_chunk(pcm)` / `agent.end_sequence()` | Feed PCM for lip-sync / end the turn |
| `session.send_director_note_cue(tag, at_seconds=...)` | Steer the face over the data channel |
| Cartesia `ws.context(..., add_timestamps=True)` / `ctx.push(text)` | Stream TTS with word timings |

**Note:** Audio passthrough and Director Notes are both **Beta** in Anam. On macOS you may see harmless libav duplicate-class warnings (OpenCV + PyAV).
