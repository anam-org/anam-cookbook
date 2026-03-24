"""
VideoSDK CascadingPipeline agent with Anam avatar.

Uses Deepgram (STT), OpenAI (LLM), ElevenLabs (TTS), and Anam for lip-synced avatar video.
Run: uv run python cascading_agent.py
"""

import os

from dotenv import load_dotenv

load_dotenv(override=True)

from videosdk.agents import (
    Agent,
    AgentSession,
    CascadingPipeline,
    ConversationFlow,
    JobContext,
    RoomOptions,
    WorkerJob,
)
from videosdk.plugins.anam import AnamAvatar
from videosdk.plugins.deepgram import DeepgramSTT
from videosdk.plugins.elevenlabs import ElevenLabsTTS
from videosdk.plugins.openai import OpenAILLM
from videosdk.plugins.silero import SileroVAD
from videosdk.plugins.turn_detector import TurnDetector, pre_download_model

pre_download_model()

class AnamVoiceAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="You are a helpful AI avatar assistant powered by VideoSDK and Anam. "
            "You have a visual avatar that speaks with you. Answer questions about weather and other tasks. "
            "Keep responses concise and conversational.", 
        )

    async def on_enter(self) -> None:
        await self.session.say(
            "Hello! I'm your AI avatar assistant. How can I help you today?"
        )

    async def on_exit(self) -> None:
        await self.session.say("Goodbye! It was nice talking with you!")


async def start_session(context: JobContext):
    stt = DeepgramSTT(
        model="nova-3", language="multi", api_key=os.getenv("DEEPGRAM_API_KEY")
    )
    llm = OpenAILLM(model="gpt-4o-mini", api_key=os.getenv("OPENAI_API_KEY"))
    tts = ElevenLabsTTS(
        api_key=os.getenv("ELEVENLABS_API_KEY"), enable_streaming=True, speed=1.2
    )

    vad = SileroVAD()
    turn_detector = TurnDetector(threshold=0.8)

    anam_avatar = AnamAvatar(
        api_key=os.getenv("ANAM_API_KEY"),
        avatar_id=os.getenv("ANAM_AVATAR_ID"),
    )

    agent = AnamVoiceAgent()
    conversation_flow = ConversationFlow(agent)

    pipeline = CascadingPipeline(
        stt=stt,
        llm=llm,
        tts=tts,
        vad=vad,
        turn_detector=turn_detector,
        avatar=anam_avatar,
    )

    session = AgentSession(
        agent=agent,
        pipeline=pipeline,
        conversation_flow=conversation_flow,
    )

    await session.start(wait_for_participant=True, run_until_shutdown=True)


def make_context() -> JobContext:
    room_options = RoomOptions(
        # room_id: omit to auto-create a room; set to join a pre-created room
        name="Anam Avatar Cascading Agent",
        playground=True,
    )
    return JobContext(room_options=room_options)


if __name__ == "__main__":
    job = WorkerJob(entrypoint=start_session, jobctx=make_context)
    job.start()
