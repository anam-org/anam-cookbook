"""Fish Audio speech and Anam avatar video in a LiveKit room."""

import os
from pathlib import Path

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, inference, room_io
from livekit.plugins import anam, silero

load_dotenv(Path(__file__).with_name(".env.local"))

INSTRUCTIONS = """You are Jun, a friendly AI assistant in a live voice conversation.
Keep replies to one to three short sentences. Use plain spoken English without
Markdown, code, or lists. You can hear the user but cannot see them or their screen.
Be clear that you are an AI if asked. Do not claim to browse or take actions.
"""

server = AgentServer()


def prewarm(proc: agents.JobProcess) -> None:
    # Load Silero once per worker process instead of on every connection.
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


def create_session(vad: silero.VAD) -> AgentSession:
    return AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="en"),
        llm=inference.LLM(model="openai/gpt-oss-120b"),
        tts=inference.TTS(
            model="fishaudio/drama-3",
            voice="536d3a5e000945adb7038665781a4aca",  # Ethan
            language="en",
        ),
        vad=vad,
    )


def create_avatar() -> anam.AvatarSession:
    return anam.AvatarSession(
        api_key=os.environ["ANAM_API_KEY"],
        persona_config=anam.PersonaConfig(
            name="Jun",
            avatarId=os.environ["ANAM_AVATAR_ID"],
            avatarModel="cara-4.1-express",
            directorNotes=anam.DirectorNotes(presetStyle="warm", expressivity=0.8),
        ),
        avatar_participant_identity="anam-fishaudio-avatar",
    )


# No agent_name: use automatic dispatch in a dedicated development project.
@server.rtc_session()
async def fishaudio_avatar(ctx: agents.JobContext):
    avatar = create_avatar()
    await ctx.connect()
    visitor = await ctx.wait_for_participant()
    session = create_session(ctx.proc.userdata["vad"])

    # Attach the avatar output before starting speech.
    await avatar.start(session, room=ctx.room)
    await session.start(
        room=ctx.room,
        agent=Agent(instructions=INSTRUCTIONS),
        room_options=room_io.RoomOptions(
            participant_identity=visitor.identity,
            close_on_disconnect=True,
            delete_room_on_close=True,
        ),
    )
    await session.say("Hi, I'm Jun, an AI assistant. What would you like to talk about?")


if __name__ == "__main__":
    agents.cli.run_app(server)
