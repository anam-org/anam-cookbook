"""
VideoSDK RealTime (S2S) Pipeline agent with Anam avatar.

Uses Gemini Live for low-latency voice and Anam for lip-synced avatar video.
Run: uv run python realtime_agent.py
"""

import logging
import os
from dotenv import load_dotenv

load_dotenv(override=True)

import aiohttp
from videosdk.agents import (
    Agent,
    AgentSession,
    JobContext,
    Pipeline,
    RoomOptions,
    WorkerJob,
    function_tool,
)
from videosdk.plugins.anam import AnamAvatar
from videosdk.plugins.google import GeminiLiveConfig, GeminiRealtime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

@function_tool
async def get_weather(location: str):
    """Called when the user asks about the weather. Returns the weather for the given location.

    Args:
        location: The location to get the weather for
    """
    geocode_url = (
            "https://geocoding-api.open-meteo.com/v1/search"
            f"?name={location}&count=1&language=en&format=json"
        )
    async with aiohttp.ClientSession() as session:
        async with session.get(geocode_url) as response:
            data = await response.json()
        results = data.get("results") or []
        if not results:
            raise Exception(f"Could not find coordinates for {location}")
        lat = results[0]["latitude"]
        lon = results[0]["longitude"]
        resolved_name = results[0]["name"]
        forecast_url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}&current=temperature_2m&timezone=auto"
        )
        async with session.get(forecast_url) as response:
            weather = await response.json()
    return {
        "location": resolved_name,
        "temperature": weather["current"]["temperature_2m"],
        "temperature_unit": "Celsius",
    }


class AnamVoiceAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="You are a helpful AI avatar assistant powered by VideoSDK and Anam. "
            "You have a visual avatar that speaks with you. Answer questions about weather and other tasks. "
            "You know how to provide real time weather information."
            "When the user asks about the weather, generate a short response first to indicate you are checking the weather."
            "Consider your initial response when providing the weather information afterwards."
            "Keep responses concise and conversational.",
            tools=[get_weather],
        )

    async def on_enter(self) -> None:
        await self.session.say(
            "Hello! I'm your real-time AI avatar assistant. How can I help you today?"
        )

    async def on_exit(self) -> None:
        await self.session.say("Goodbye! It was great talking with you!")


async def start_session(context: JobContext):
    model = GeminiRealtime(
        model="gemini-2.5-flash-native-audio-preview-12-2025",
        config=GeminiLiveConfig(
            voice="Leda",
            response_modalities=["AUDIO"],
        ),
    )

    anam_avatar = AnamAvatar(
        api_key=os.getenv("ANAM_API_KEY"),
        avatar_id=os.getenv("ANAM_AVATAR_ID") or None,
    )

    session = AgentSession(
        agent=AnamVoiceAgent(),
        pipeline=Pipeline(
            llm=model,
            avatar=anam_avatar,
        ),
    )

    await session.start(wait_for_participant=True, run_until_shutdown=True)


def make_context() -> JobContext:
    room_options = RoomOptions(
        name="Anam Avatar Realtime Agent",
        playground=True,
    )
    return JobContext(room_options=room_options)


if __name__ == "__main__":
    job = WorkerJob(entrypoint=start_session, jobctx=make_context)
    job.start()
