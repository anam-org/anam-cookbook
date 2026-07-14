# Pipecat director-note cues, timed to Cartesia word timestamps

A Pipecat voice agent whose Anam avatar *performs* the reply: inline `[tag]` cues
in the assistant text are sent to Anam over the data channel, each
timed to the word it precedes.

**How:** the `[tag]` cues are sent to Cartesia unchanged. Cartesia (sonic-3.5)
echoes each inline marker back in its word timestamps at the moment it's spoken —
`[happy]` comes back as its own token timed to where it sits. A `CartesiaTTSService`
subclass reads that start time and calls `AnamTransport.send_director_note_cue(tag,
at_seconds=...)`, so the cue reaches Anam ahead of the audio and the avatar
hits it on the word. No stripping, no anchor word, no matching.

- `cues.py` — the cue-tag vocabulary + pulling tags out of Cartesia tokens (pure; `python cues.py` self-checks).
- `director_cue_tts.py` — `DirectorCueCartesiaTTSService`, the Pipecat glue.
- `bot.py` — the pipeline (Deepgram STT, OpenAI LLM, Cartesia TTS, Anam avatar).

## Prerequisites

- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- A **Cara-4** avatar (director notes need it) — get an `avatar_id` at [lab.anam.ai](https://lab.anam.ai)
- API keys: Anam, [Deepgram](https://deepgram.com), [Cartesia](https://cartesia.ai), [OpenAI](https://platform.openai.com)
- A [Daily](https://dashboard.daily.co) room (a public room needs no tokens)

> Direct Daily egress (`AnamTransport`) is an experimental alpha and pins
> `anam==0.7.0a1`. Expect breaking changes between alphas.

## Setup

```bash
cd examples/pipecat-director-notes
uv sync
cp .env.example .env
# edit .env with your keys and DAILY_ROOM_URL
```

## Run

```bash
uv run python bot.py
```

Open your `DAILY_ROOM_URL` in a browser to join. On connect the avatar opens with a
short LLM greeting (primed to use a cue) so you can see one fire; after that it keeps
adding cues as the conversation goes.

## Author cues

Put a tag in square brackets just before the word it should land on — Cartesia
times the cue to that spot and does not read the tag aloud:

```
"That is [happy] wonderful! But be [concerned] careful with the total."
```

Valid tags (Cara-4): `happy`, `warm`, `playful`, `curious`, `supportive`,
`concerned`, `sad`, `surprised`, `angry`, `distressed`, `laughter`. Cartesia also
renders non-verbals it knows (notably `[laughter]`) in the voice. Set the baseline
delivery for the whole session with `PersonaConfig(director_notes=...)`. See the
[Anam director-notes docs](https://anam.ai/docs/personas/director-notes).
