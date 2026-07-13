"""Cartesia Sonic 3.5 -> Anam audio passthrough, with synced Director Notes cues.

You type a line of text (optionally annotated with [tags] like [warm] or
[laughter]); Cartesia streams the synthesised audio and the Anam avatar speaks
it via audio passthrough as it arrives. The tags drive both the voice and face:

  - VOICE: Cartesia's own reading of the text (Sonic interprets emotional
    subtext), with the [laughter] non-verbal kept inline.
  - FACE:  sent as Anam Director Notes cues over the WebRTC data channel, timed
    to the spoken word using Cartesia's word-level timestamps (at_seconds).

Everything runs at 16 kHz / pcm_s16le / mono, so no resampling is needed.

Usage:
    uv run python main.py                       # interactive: type lines to speak
    uv run python main.py --text "[warm] Hi. [surprised] Oh! [laughter]"

Requires: ANAM_API_KEY, CARTESIA_API_KEY (see .env.example). Needs a cara-4
avatar and anam>=0.7.0a1 (Director Notes are only in the 0.7 alpha line).
"""

import argparse
import asyncio
import os
import sys
import threading
import time

from dotenv import load_dotenv

from anam import AnamClient, AnamEvent, ClientOptions
from anam.types import AgentAudioInputConfig, DirectorNotes, PersonaConfig
from cartesia import Cartesia

from cues import CueTimer, parse_tagged_line

_ = load_dotenv()

DEFAULT_AVATAR_ID = "071b0286-4cce-4808-bee2-e642f1062de3"  # stock "Liv"
SAMPLE_RATE = 16000  # Cartesia output == Anam passthrough input; no resampling
CHANNELS = 1
PCM_BYTES_PER_SAMPLE = 2  # pcm_s16le
RETURN_TO_NEUTRAL_SECONDS = 2.0


class VideoDisplay:
    """Display video frames in an OpenCV window."""

    def __init__(self, window_name: str = "Anam Avatar") -> None:
        self.window_name = window_name
        self._frame = None
        self._running = True

    def update(self, frame) -> None:
        self._frame = frame.to_ndarray(format="bgr24") if frame is not None else None

    def run(self) -> None:
        import cv2

        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        while self._running:
            if self._frame is not None:
                cv2.imshow(self.window_name, self._frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        cv2.destroyAllWindows()

    def stop(self) -> None:
        self._running = False

    def is_running(self) -> bool:
        return self._running


class AudioPlayer:
    """Play the avatar's rendered audio frames through the speakers."""

    def __init__(self, sample_rate: int = 48000, channels: int = 2) -> None:
        import numpy as np
        import sounddevice as sd

        self._np = np
        self._sd = sd
        self._sample_rate = sample_rate
        self._channels = channels
        self._stream = None

    def start(self) -> None:
        self._stream = self._sd.OutputStream(
            samplerate=self._sample_rate,
            channels=self._channels,
            dtype="float32",
            blocksize=1024,
            latency="low",
        )
        self._stream.start()

    def add_frame(self, frame) -> None:
        if self._stream is None:
            return

        audio = (
            frame.to_ndarray().reshape(-1, frame.layout.nb_channels).astype(self._np.float32)
            / 32768.0
        )
        self._stream.write(audio)

    def stop(self) -> None:
        if self._stream:
            self._stream.stop()
            self._stream.close()
            self._stream = None


def _stream_turn(cartesia, session, agent, segments, voice_id, model_id, loop) -> int:
    """Stream one turn (blocking — runs in a worker thread).

    Cartesia streams audio chunks and word timestamps; we forward each audio
    chunk to Anam as it arrives, and fire each face cue the moment its word's
    timestamp streams in (a CueTimer turns streaming timings into cues).

    Cartesia's client is synchronous, so each async Anam send is bridged back
    onto the event loop with run_coroutine_threadsafe(...).result() — which also
    gives natural backpressure and preserves ordering.
    """

    def send(coro):
        return asyncio.run_coroutine_threadsafe(coro, loop).result()

    timer = CueTimer(segments)
    audio_bytes_sent = 0
    with cartesia.tts.websocket_connect() as ws:
        ctx = ws.context(
            model_id=model_id,
            voice={"mode": "id", "id": voice_id},
            output_format={
                "container": "raw",
                "encoding": "pcm_s16le",
                "sample_rate": SAMPLE_RATE,
            },
            language="en",
            add_timestamps=True,
        )
        for seg in segments:
            text = seg.cartesia_text()  # [laughter] kept inline so the voice laughs
            if text:
                ctx.push(text)
        ctx.no_more_inputs()

        for resp in ctx.receive():
            kind = getattr(resp, "type", None)
            if kind == "chunk":
                audio = getattr(resp, "audio", None)
                if audio:
                    send(agent.send_audio_chunk(audio))  # forward as it arrives
                    audio_bytes_sent += len(audio)
            elif kind == "timestamps" and getattr(resp, "word_timestamps", None):
                wt = resp.word_timestamps
                for tag, at in timer.feed(wt.words, wt.start, wt.end):
                    print(f"cue: {tag} @ {at}s")
                    send(session.send_director_note_cue(tag, at_seconds=at))
            elif kind == "error":
                msg = getattr(resp, "message", None) or getattr(resp, "title", "")
                raise RuntimeError(f"Cartesia error: {msg}")

    for tag, at in timer.flush():
        print(f"cue: {tag} @ {at}s")
        send(session.send_director_note_cue(tag, at_seconds=at))

    return audio_bytes_sent


async def run(
    *,
    anam_key: str,
    avatar_id: str,
    avatar_model: str,
    baseline_style: str,
    cartesia_key: str,
    voice_id: str,
    model_id: str,
    one_shot: str | None,
    speak_ref: list,
    display: VideoDisplay,
    audio_player: AudioPlayer,
) -> None:
    persona_config = PersonaConfig(
        avatar_id=avatar_id,
        avatar_model=avatar_model,  # Director Notes require a cara-4 avatar
        enable_audio_passthrough=True,
        director_notes=DirectorNotes(preset_style=baseline_style, expressivity=0.7),
    )
    client = AnamClient(
        api_key=anam_key, persona_config=persona_config, options=ClientOptions()
    )
    cartesia = Cartesia(api_key=cartesia_key)

    session_ready = asyncio.Event()

    @client.on(AnamEvent.CONNECTION_ESTABLISHED)
    async def _connected() -> None:
        print("Connected to Anam")

    @client.on(AnamEvent.SESSION_READY)
    async def _ready() -> None:
        session_ready.set()

    @client.on(AnamEvent.CONNECTION_CLOSED)
    async def _closed(code: str, reason: str | None) -> None:
        print(f"Connection closed: {code}")
        display.stop()

    session = await client.connect_async()
    turn_lock = asyncio.Lock()

    async def speak(line: str) -> float:
        segments = parse_tagged_line(line)
        if not any(seg.cartesia_text() for seg in segments):
            return 0.0
        async with turn_lock:  # one turn at a time
            print(f"segments: {[(s.tag, s.text) for s in segments]}")
            agent = session.create_agent_audio_input_stream(
                AgentAudioInputConfig(
                    encoding="pcm_s16le", sample_rate=SAMPLE_RATE, channels=CHANNELS
                )
            )
            loop = asyncio.get_running_loop()
            # Stream Cartesia -> Anam in a worker thread: audio chunks and cues are
            # forwarded as they arrive, so the avatar starts speaking almost at once.
            audio_bytes_sent = await loop.run_in_executor(
                None, _stream_turn, cartesia, session, agent, segments, voice_id, model_id, loop
            )
            await agent.end_sequence()
            return audio_bytes_sent / (SAMPLE_RATE * CHANNELS * PCM_BYTES_PER_SAMPLE)

    async with session:
        print(f"Session: {session.session_id}")

        async def consume_video():
            async for frame in session.video_frames():
                display.update(frame)

        async def consume_audio():
            async for frame in session.audio_frames():
                audio_player.add_frame(frame)

        asyncio.create_task(consume_video())
        asyncio.create_task(consume_audio())

        try:
            await asyncio.wait_for(session_ready.wait(), timeout=30.0)
        except asyncio.TimeoutError:
            print("Session did not become ready in time", file=sys.stderr)
            display.stop()
            return
        print("Session ready.")

        if one_shot is not None:
            playback_seconds = await speak(one_shot)
            await asyncio.sleep(playback_seconds + RETURN_TO_NEUTRAL_SECONDS)
            display.stop()
        else:
            # Expose speak() to the stdin thread and idle until the user quits.
            loop = asyncio.get_running_loop()

            def schedule_speak(line: str) -> None:
                future = asyncio.run_coroutine_threadsafe(speak(line), loop)

                def report_error(done) -> None:
                    try:
                        done.result()
                    except Exception as e:  # noqa: BLE001 - surface interactive turn errors
                        print(f"Error while speaking: {e}", file=sys.stderr)

                future.add_done_callback(report_error)

            speak_ref[0] = schedule_speak
            while display.is_running():
                await asyncio.sleep(0.2)

    display.stop()
    audio_player.stop()
    print("Done")


def _stdin_loop(speak_ref: list, display: VideoDisplay) -> None:
    """Read typed lines and schedule them on the asyncio loop."""
    while speak_ref[0] is None and display.is_running():
        time.sleep(0.1)
    print(
        "\nType a line for the avatar to speak. Add [tags] like "
        "[warm] [surprised] [laughter].\nBlank line to quit.\n"
    )
    while display.is_running():
        try:
            line = input("> ")
        except EOFError:
            break
        if not line.strip():
            break
        speak_ref[0](line)
    display.stop()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Type text -> Cartesia TTS -> Anam avatar with Director Notes cues"
    )
    parser.add_argument(
        "--text", "-t", help="Speak this one line and exit (otherwise interactive)"
    )
    args = parser.parse_args()

    def env(name: str, default: str = "") -> str:
        return os.environ.get(name, default).strip().strip('"')

    anam_key = env("ANAM_API_KEY")
    cartesia_key = env("CARTESIA_API_KEY")
    if not anam_key or not cartesia_key:
        print("Set ANAM_API_KEY and CARTESIA_API_KEY (see .env.example)", file=sys.stderr)
        sys.exit(1)

    avatar_id = env("ANAM_AVATAR_ID") or DEFAULT_AVATAR_ID
    avatar_model = env("ANAM_AVATAR_MODEL") or "cara-4"
    baseline_style = env("ANAM_BASELINE_STYLE") or "warm"
    voice_id = env("CARTESIA_VOICE_ID") or "6ccbfb76-1fc6-48f7-b71d-91ac6298247b"
    model_id = env("CARTESIA_MODEL") or "sonic-3.5"

    speak_ref: list = [None]
    display = VideoDisplay()
    audio_player = AudioPlayer()
    audio_player.start()

    def run_async() -> None:
        try:
            asyncio.run(
                run(
                    anam_key=anam_key,
                    avatar_id=avatar_id,
                    avatar_model=avatar_model,
                    baseline_style=baseline_style,
                    cartesia_key=cartesia_key,
                    voice_id=voice_id,
                    model_id=model_id,
                    one_shot=args.text,
                    speak_ref=speak_ref,
                    display=display,
                    audio_player=audio_player,
                )
            )
        except Exception as e:  # noqa: BLE001 - surface any startup error
            print(f"Error: {e}", file=sys.stderr)
            display.stop()

    threading.Thread(target=run_async, daemon=True).start()
    if args.text is None:
        threading.Thread(target=_stdin_loop, args=(speak_ref, display), daemon=True).start()

    try:
        display.run()
    except KeyboardInterrupt:
        pass
    finally:
        display.stop()
        audio_player.stop()


if __name__ == "__main__":
    main()
