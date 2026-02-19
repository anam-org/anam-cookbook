"""Anam audio passthrough: send TTS to avatar from text.

Script-style: runs from start to finish. Uses ElevenLabs for text-to-speech.
Shows the avatar video in an OpenCV window.

Usage:
    uv run python main.py --text "Hello, this is a test"

Requires: ANAM_API_KEY, ANAM_AVATAR_ID, ELEVENLABS_API_KEY
"""

import argparse
import asyncio
import os
import sys
import threading
import cv2
from dotenv import load_dotenv

from anam import AnamClient, AnamEvent, ClientOptions
from anam.types import AgentAudioInputConfig, PersonaConfig

_ = load_dotenv()

DEFAULT_AVATAR_ID = "071b0286-4cce-4808-bee2-e642f1062de3"


class VideoDisplay:
    """Display video frames in an OpenCV window."""

    def __init__(self, window_name: str = "Anam Avatar") -> None:
        self.window_name = window_name
        self._frame = None
        self._running = True

    def update(self, frame) -> None:
        """Update the displayed frame (call from async context)."""
        self._frame = frame.to_ndarray(format="bgr24") if frame is not None else None

    def run(self) -> None:
        """Run the display loop (call from main thread)."""
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
    """Play audio frames through the device."""

    def __init__(self, sample_rate: int = 48000, channels: int = 2) -> None:
        import sounddevice as sd

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
        """Play an audio frame (PyAV AudioFrame)."""
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


def get_pcm_from_elevenlabs(text: str, voice_id: str, api_key: str) -> bytes:
    """Convert text to speech via ElevenLabs, return PCM 24kHz mono bytes."""
    from elevenlabs.client import ElevenLabs

    client = ElevenLabs(api_key=api_key)
    response = client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id="eleven_turbo_v2_5",
        output_format="pcm_24000",
    )
    if isinstance(response, bytes):
        return response
    return b"".join(response)


async def send_pcm_to_agent(agent, pcm_bytes: bytes, chunk_size: int = 12000) -> None:
    """Send PCM bytes to agent in chunks."""
    for i in range(0, len(pcm_bytes), chunk_size):
        chunk = pcm_bytes[i : i + chunk_size]
        if chunk:
            await agent.send_audio_chunk(chunk)
            await asyncio.sleep(0.01)


async def run(
    api_key: str,
    avatar_id: str,
    text: str,
    elevenlabs_api_key: str,
    elevenlabs_voice_id: str,
    display: VideoDisplay,
    audio_player: AudioPlayer,
) -> None:
    if not elevenlabs_api_key:
        raise ValueError("ELEVENLABS_API_KEY required")

    persona_config = PersonaConfig(
        avatar_id=avatar_id,
        enable_audio_passthrough=True,
    )

    client = AnamClient(
        api_key=api_key,
        persona_config=persona_config,
        options=ClientOptions(),
    )

    session_ready = asyncio.Event()

    @client.on(AnamEvent.CONNECTION_ESTABLISHED)
    async def on_connected() -> None:
        print("Connected to Anam")

    @client.on(AnamEvent.SESSION_READY)
    async def on_session_ready() -> None:
        session_ready.set()

    @client.on(AnamEvent.CONNECTION_CLOSED)
    async def on_closed(code: str, reason: str | None) -> None:
        print(f"Connection closed: {code}")

    async with client.connect() as session:
        print(f"Session: {session.session_id}")
        print("Press 'q' in the video window to quit early")

        # Display video frames
        async def consume_video():
            async for frame in session.video_frames():
                display.update(frame)

        # Consume audio (play through speakers)
        async def consume_audio():
            async for frame in session.audio_frames():
                audio_player.add_frame(frame)

        asyncio.create_task(consume_video())
        asyncio.create_task(consume_audio())

        # Wait for WebRTC session ready before sending audio
        await asyncio.wait_for(session_ready.wait(), timeout=30.0)
        print("Session ready, sending audio...")

        # Get PCM audio (now that we're ready to send)
        print(f"Converting to speech: {text[:50]}...")
        pcm_bytes = get_pcm_from_elevenlabs(text, elevenlabs_voice_id, elevenlabs_api_key)

        # Send TTS to avatar
        agent = session.create_agent_audio_input_stream(
            AgentAudioInputConfig(encoding="pcm_s16le", sample_rate=24000, channels=1)
        )
        await send_pcm_to_agent(agent, pcm_bytes)
        await agent.end_sequence()

        # Wait for playback to finish, then extra time before stopping session
        duration_sec = len(pcm_bytes) / (24000 * 2)
        await asyncio.sleep(duration_sec + 10.0)

    display.stop()
    audio_player.stop()
    print("Done")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Send TTS audio to Anam avatar (text via ElevenLabs)"
    )
    parser.add_argument("--text", "-t", required=True, help="Text to convert to speech via ElevenLabs")
    parser.add_argument(
        "--voice",
        default=os.environ.get("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL"),
        help="ElevenLabs voice ID (default: Rachel)",
    )
    args = parser.parse_args()

    api_key = os.environ.get("ANAM_API_KEY", "").strip().strip('"')
    avatar_id = os.environ.get("ANAM_AVATAR_ID", "").strip().strip('"') or DEFAULT_AVATAR_ID
    elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY", "").strip().strip('"')

    if not api_key:
        print("Set ANAM_API_KEY", file=sys.stderr)
        sys.exit(1)

    display = VideoDisplay()
    audio_player = AudioPlayer()
    audio_player.start()

    def run_async() -> None:
        try:
            asyncio.run(
                run(
                    api_key=api_key,
                    avatar_id=avatar_id,
                    text=args.text,
                    elevenlabs_api_key=elevenlabs_key,
                    elevenlabs_voice_id=args.voice,
                    display=display,
                    audio_player=audio_player,
                )
            )
        except ValueError as e:
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
