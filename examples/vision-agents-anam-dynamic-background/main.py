import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from vision_agents.core import Agent, AgentLauncher, Runner, User
from vision_agents.core.stt.events import STTTranscriptEvent
from vision_agents.core.turn_detection import TurnStartedEvent
from vision_agents.core.utils.examples import get_weather_by_location
from vision_agents.plugins import deepgram, gemini, getstream
from vision_agents.plugins.getstream import CallSessionParticipantJoinedEvent

from scene_aware_anam_avatar_publisher import SceneAwareAnamAvatarPublisher

logger = logging.getLogger(__name__)

load_dotenv()

INSTRUCTIONS = (
    "You're a friendly Anam avatar assistant running on Stream with Vision Agents. "
    "Keep answers short and conversational for voice. "
    "Prioritize automatic scene behavior: for recipe or cooking requests, call "
    "provide_cooking_instructions; for weather requests, call get_weather. "
    "Never announce that scenes are changing."
)

COOKING_PLANS = {
    "omelette": [
        "Whisk two eggs with a pinch of salt and pepper.",
        "Heat a non-stick pan with a little butter.",
        "Pour in eggs and gently fold until just set.",
        "Serve immediately with herbs or cheese.",
    ],
    "pasta": [
        "Boil salted water and cook pasta until al dente.",
        "Warm olive oil with garlic in a pan for one minute.",
        "Toss pasta with the garlic oil and a splash of pasta water.",
        "Finish with chili flakes, parsley, and parmesan.",
    ],
    "stir_fry": [
        "Slice vegetables and protein into bite-size pieces.",
        "Cook protein first in a hot pan, then remove.",
        "Stir-fry vegetables for two minutes and add sauce.",
        "Return protein, toss for one minute, then serve with rice.",
    ],
}


def _recipe_steps(dish: str) -> list[str]:
    normalized = dish.strip().lower().replace("-", "_").replace(" ", "_")
    if normalized in COOKING_PLANS:
        return COOKING_PLANS[normalized]

    return [
        f"Prep all ingredients for {dish} before heating the pan.",
        "Cook proteins first, then layer in vegetables and aromatics.",
        "Season in stages and taste as you go.",
        "Serve while hot and finish with a fresh garnish.",
    ]


def _infer_scene_from_request(text: str) -> str | None:
    normalized = text.strip().lower()
    if not normalized:
        return None

    recipe_keywords = (
        "cook",
        "cooking",
        "recipe",
        "ingredient",
        "meal",
        "dish",
    )
    weather_keywords = (
        "weather",
        "forecast",
        "temperature",
        "rain",
        "sunny",
        "wind",
        "humidity",
    )

    if any(keyword in normalized for keyword in recipe_keywords):
        return "kitchen"
    if any(keyword in normalized for keyword in weather_keywords):
        return "studio"

    return None


def setup_llm(
    avatar: SceneAwareAnamAvatarPublisher,
    model: str = "gemini-3.1-flash-lite-preview",
) -> gemini.LLM:
    llm = gemini.LLM(model)

    @llm.register_function(
        description=(
            "Provide quick cooking instructions and switch the avatar to a kitchen background."
        )
    )
    async def provide_cooking_instructions(dish: str) -> dict[str, object]:
        selected = await avatar.set_scene("kitchen")
        steps = _recipe_steps(dish)
        return {"scene": selected, "dish": dish, "steps": steps}

    @llm.register_function(description="Get current weather for a location")
    async def get_weather(location: str) -> dict[str, object]:
        await avatar.set_scene("studio")
        return await get_weather_by_location(location)

    return llm


async def create_agent(**kwargs) -> Agent:
    background_dir = Path(__file__).parent / "assets" / "backgrounds"
    avatar = SceneAwareAnamAvatarPublisher(
        background_dir=str(background_dir),
        width=int(os.getenv("ANAM_AVATAR_WIDTH", "1280")),
        height=int(os.getenv("ANAM_AVATAR_HEIGHT", "720")),
        green_threshold=int(os.getenv("ANAM_GREEN_THRESHOLD", "88")),
        green_bias=float(os.getenv("ANAM_GREEN_BIAS", "1.14")),
        green_tolerance=int(os.getenv("ANAM_GREEN_TOLERANCE", "22")),
        edge_expand=int(os.getenv("ANAM_GREEN_EDGE_EXPAND", "1")),
    )

    llm = setup_llm(
        avatar=avatar,
        model=os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview"),
    )

    return Agent(
        edge=getstream.Edge(),
        agent_user=User(name="Anam dynamic scene avatar", id="agent"),
        instructions=INSTRUCTIONS,
        processors=[avatar],
        llm=llm,
        tts=deepgram.TTS(),
        stt=deepgram.STT(eager_turn_detection=True),
    )


async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    call = await agent.create_call(call_type, call_id)
    avatar = next(
        (
            processor
            for processor in agent.processors
            if isinstance(processor, SceneAwareAnamAvatarPublisher)
        ),
        None,
    )

    @agent.events.subscribe
    async def on_participant_joined(event: CallSessionParticipantJoinedEvent) -> None:
        if event.participant.user.id == "agent":
            return

        await agent.simple_response(
            "Hi, I can help with quick recipes and weather. "
            "Ask me for a dish or weather in any city."
        )

    if avatar is not None:
        is_user_turn = False

        @agent.events.subscribe
        async def on_turn_started(event: TurnStartedEvent) -> None:
            nonlocal is_user_turn
            participant = event.participant
            if participant is None or participant.user_id == agent.agent_user.id:
                is_user_turn = False
                return
            is_user_turn = True
            await avatar.reset_scene()

        @agent.events.subscribe
        async def on_transcript(event: STTTranscriptEvent) -> None:
            if not is_user_turn or event.text is None:
                return

            inferred = _infer_scene_from_request(event.text)
            if inferred is not None:
                await avatar.set_scene(inferred)

    async with agent.join(call):
        await agent.simple_response(
            "Welcome. Ask for a recipe or ask for weather in your city."
        )
        await agent.finish()


if __name__ == "__main__":
    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()
