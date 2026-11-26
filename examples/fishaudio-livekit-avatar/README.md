# Fish Audio + LiveKit + Anam

A Python LiveKit agent using Fish Audio Drama 3 with the Ethan voice and an Anam Jun avatar. Deepgram Nova-3 and GPT-OSS-120B provide speech recognition and replies through LiveKit Inference.

## Run locally

Requires Python 3.11–3.13, [uv](https://docs.astral.sh/uv/), a LiveKit Cloud project with Inference enabled, and an Anam API key. No separate Fish Audio, Deepgram, or OpenAI key is used by this example.

```bash
uv sync --locked
cp .env.example .env.local
```

Fill in `.env.local` privately. Use an avatar ID available to your Anam account; the supplied stock ID is Jun. Then run:

```bash
uv run -m livekit.agents download-files
uv run agent.py dev
```

Connect a browser frontend to the same LiveKit project. The [LiveKit React agent starter](https://github.com/livekit-examples/agent-starter-react) supports avatar video:

```bash
git clone https://github.com/livekit-examples/agent-starter-react.git
cd agent-starter-react
pnpm install
cp .env.example .env.local
```

Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in the frontend's private `.env.local`. Leave `AGENT_NAME` empty for this example's automatic dispatch. Start `pnpm dev`, open the local URL, and connect with microphone permission.

Use a dedicated development project with only this automatically dispatched worker running. The example binds each session to its first visitor and deletes that room when the visitor disconnects. For a shared project, give the worker an explicit agent name and configure the frontend's dispatch to match.

## Verify the conversation

- Hear the greeting once and see Jun's video.
- Ask a short question and check that the response uses Ethan's voice.
- Interrupt a longer answer; audio and avatar playback should stop together.
- Disconnect and confirm the room closes. Reconnect and check that a new session starts.

The avatar plugin owns the speech output. Do not play a second copy of the raw TTS audio. A frontend that hides the avatar should keep the room and audio subscription active.

## Change the experience

Edit `INSTRUCTIONS` for behavior, the `voice` ID for an available Fish Audio voice, and `ANAM_AVATAR_ID` for appearance. `directorNotes` sets a baseline visual style. Fish Audio delivery tags do not provide synchronized per-phrase Anam expression control in this path.

This is a local learning example. Add authentication, rate limits, usage limits, and deployment configuration before making its frontend public.

Full walkthrough: [Build a Fish Audio voice agent with Anam and LiveKit](https://anam.ai/cookbook/fishaudio-livekit-avatar).
