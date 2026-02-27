"""BYO LLM: send your LLM's output to Anam for TTS and avatar.

You run your own LLM; Anam handles TTS and avatar in a single pipeline.
Uses llm_id="CUSTOMER_CLIENT_V1" to disable Anam's LLM in the orchestration layer.

This example focuses on:
- PersonaConfig with CUSTOMER_CLIENT_V1 (disables Anam's LLM)
- Sending LLM output via talk_stream.send() from a file (one text chunk per line)
- Real-time streaming words (MESSAGE_STREAM_EVENT_RECEIVED)
- Full message history (get_message_history, MESSAGE_HISTORY_UPDATED)
- Interrupt: press 'i' to call session.interrupt(); client TALK_STREAM_INTERRUPTED callback creates new stream

Usage:
    uv run python main.py llm_output_sample.txt
    uv run python main.py path/to/chunks.txt

Requires: ANAM_API_KEY, ANAM_AVATAR_ID, ANAM_VOICE_ID
"""

import argparse
import asyncio
import logging
import os
import sys
import threading

import cv2
from dotenv import load_dotenv

from anam import AnamClient, AnamEvent, ClientOptions
from anam.types import MessageRole, PersonaConfig, SessionOptions

_ = load_dotenv()

DEFAULT_AVATAR_ID = "071b0286-4cce-4808-bee2-e642f1062de3"
DEFAULT_VOICE_ID = "b8a3b36d-7869-4085-aa50-98eed85a1415"

# Required to disable Anam's LLM, you provide the LLM output via talk_stream.send()
CUSTOMER_CLIENT_V1 = "CUSTOMER_CLIENT_V1"

logging.basicConfig(level=logging.WARNING)
logging.getLogger("anam").setLevel(logging.DEBUG)
# logging.getLogger("aiortc").setLevel(logging.WARNING)
# logging.getLogger("aioice").setLevel(logging.WARNING)
# logging.getLogger("websocket").setLevel(logging.WARNING)

class VideoDisplay:
    """Display video frames in an OpenCV window."""

    def __init__(
        self,
        window_name: str = "Anam Avatar",
        on_interrupt_ref: list | None = None,
    ) -> None:
        self.window_name = window_name
        self._frame = None
        self._running = True
        self._on_interrupt_ref = on_interrupt_ref or []

    def update(self, frame) -> None:
        self._frame = frame.to_ndarray(format="bgr24") if frame is not None else None

    def run(self) -> None:
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
        while self._running:
            if self._frame is not None:
                cv2.imshow(self.window_name, self._frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("i") and self._on_interrupt_ref and self._on_interrupt_ref[0]:
                self._on_interrupt_ref[0]()
        cv2.destroyAllWindows()

    def stop(self) -> None:
        self._running = False

    def is_running(self) -> bool:
        return self._running


class AudioPlayer:
    """Play audio frames through the device."""

    def __init__(self, sample_rate: int = 48000, channels: int = 2) -> None:
        import sounddevice as sd

        self._sd = sd
        self._stream = None

    def start(self) -> None:
        self._stream = self._sd.OutputStream(
            samplerate=48000,
            channels=2,
            dtype="float32",
            blocksize=1024,
            latency="low",
        )
        self._stream.start()

    def add_frame(self, frame) -> None:
        if self._stream is None:
            return
        import numpy as np

        audio = (
            frame.to_ndarray().reshape(-1, frame.layout.nb_channels).astype(np.float32)
            / 32768.0
        )
        self._stream.write(audio)

    def stop(self) -> None:
        if self._stream:
            self._stream.stop()
            self._stream.close()
            self._stream = None


def build_persona_config() -> PersonaConfig:
    """Build PersonaConfig for BYO LLM: Anam does TTS + avatar only.

    llm_id="CUSTOMER_CLIENT_V1" disables Anam's LLM in the orchestration layer.
    You send your LLM's output via talk_stream.send() to TTS.
    """
    avatar_id = os.environ.get("ANAM_AVATAR_ID", DEFAULT_AVATAR_ID).strip().strip('"')
    voice_id = os.environ.get("ANAM_VOICE_ID", DEFAULT_VOICE_ID).strip().strip('"')

    return PersonaConfig(
        avatar_id=avatar_id,
        voice_id=voice_id,
        llm_id=CUSTOMER_CLIENT_V1,  # Disables Anam's LLM; you provide output via talk_stream.send()
        enable_audio_passthrough=False,
    )


def _load_llm_chunks(path: str) -> list[str]:
    """Load text chunks from file. One line per chunk."""
    with open(path) as f:
        return [line.strip() for line in f if line.strip()]


async def run(
    api_key: str,
    llm_chunks_path: str,
    display: VideoDisplay,
    audio_player: AudioPlayer,
    on_interrupt_ref: list | None = None,
) -> None:
    persona_config = build_persona_config()
    print(f"PersonaConfig: {persona_config}")

    client = AnamClient(
        api_key=api_key,
        persona_config=persona_config,
        options=ClientOptions(),
    )

    # Real-time streaming words: MESSAGE_STREAM_EVENT_RECEIVED
    @client.on(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED)
    async def on_stream_event(event) -> None:
        role_label = "User" if event.role == MessageRole.USER else "Persona"
        if event.content_index == 0:
            print(f"\n{role_label}: ", end="", flush=True)
        print(event.content, end="", flush=True)
        if event.end_of_speech:
            status = " ✓" if not event.interrupted else " (interrupted)"
            print(status)

    # Full message history: MESSAGE_HISTORY_UPDATED
    @client.on(AnamEvent.MESSAGE_HISTORY_UPDATED)
    async def on_history_updated(messages) -> None:
        print("\n--- Message history ---")
        for m in messages:
            role = m.role.value.capitalize()
            content = m.content[:80] + "..." if len(m.content) > 80 else m.content
            print(f"  {role}: {content}")
        print("-----------------------\n")

    @client.on(AnamEvent.CONNECTION_ESTABLISHED)
    async def on_connected() -> None:
        print("Connected to Anam")

    @client.on(AnamEvent.CONNECTION_CLOSED)
    async def on_closed(code: str, reason: str | None) -> None:
        print(f"\nConnection closed: {code}")

    session_ready = asyncio.Event()

    @client.on(AnamEvent.SESSION_READY)
    async def on_session_ready() -> None:
        session_ready.set()

    session_options = SessionOptions(enable_session_replay=False)
    session = await client.connect_async(session_options=session_options)

    # Wait for backend to be ready before sending TTS chunks
    await asyncio.wait_for(session_ready.wait(), timeout=30)

    talk_stream = session.create_talk_stream()
    
    @client.on(AnamEvent.TALK_STREAM_INTERRUPTED)
    async def on_talk_stream_interrupted(correlation_id: str | None) -> None:
        print(f"Application level talk stream interruption handling for: {correlation_id}")
        nonlocal talk_stream
        talk_stream = session.create_talk_stream()
        follow_up = "Okay, interrupted. What else can I help you with today?"
        await talk_stream.send(follow_up, end_of_speech=True)
        

    try:
        print(f"Session: {session.session_id}")
        print("Press 'q' to quit, 'i' to interrupt\n")

        # When 'i' is pressed, call session.interrupt() from the client
        if on_interrupt_ref is not None:
            loop = asyncio.get_running_loop()
            on_interrupt_ref[0] = lambda: asyncio.run_coroutine_threadsafe(
                session.interrupt(), loop
            )

        async def consume_video():
            async for frame in session.video_frames():
                display.update(frame)

        async def consume_audio():
            async for frame in session.audio_frames():
                audio_player.add_frame(frame)

        asyncio.create_task(consume_video())
        asyncio.create_task(consume_audio())

        # Send LLM output directly to TTS (bypasses Anam's LLM)
        chunks = _load_llm_chunks(llm_chunks_path)
        print(f"Streaming {len(chunks)} chunks from {llm_chunks_path}")
        talk_stream = session.create_talk_stream()
        for i, text in enumerate(chunks):
            await asyncio.sleep(0.450)            
            if talk_stream is not None and talk_stream.is_active:
                try:
                    await talk_stream.send(
                        text,
                        end_of_speech=(i == len(chunks) - 1),
                    )
                except RuntimeError:
                    pass

        # Keep the connection open for 60 seconds - or until the user quits
        await asyncio.sleep(60.0)

        # Print final message history
        history = client.get_message_history()
        print("\n=== Final message history ===")
        for m in history:
            print(f"  {m.role.value}: {m.content}")
        print("=============================")
    finally:
        await session.close()

    display.stop()
    audio_player.stop()
    print("Done")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Send your LLM's output to Anam for TTS and avatar (BYO LLM)"
    )
    parser.add_argument(
        "file",
        nargs="?",
        default="llm_output_sample.txt",
        help="Path to LLM chunks file (one text chunk per line). Default: llm_output_sample.txt",
    )
    args = parser.parse_args()

    api_key = os.environ.get("ANAM_API_KEY", "").strip().strip('"')

    if not api_key:
        print("Set ANAM_API_KEY", file=sys.stderr)
        sys.exit(1)

    on_interrupt_ref: list = [None]
    display = VideoDisplay(on_interrupt_ref=on_interrupt_ref)
    audio_player = AudioPlayer()
    audio_player.start()

    def run_async() -> None:
        try:
            asyncio.run(
                run(
                    api_key=api_key,
                    llm_chunks_path=args.file,
                    display=display,
                    audio_player=audio_player,
                    on_interrupt_ref=on_interrupt_ref,
                )
            )
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            display.stop()

    thread = threading.Thread(target=run_async, daemon=True)
    thread.start()

    try:
        display.run()
    except KeyboardInterrupt:
        pass
    finally:
        display.stop()
        audio_player.stop()
        thread.join(timeout=2.0)


if __name__ == "__main__":
    main()
