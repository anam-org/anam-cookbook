"""Pipecat + Anam: fire director-note cues in time with the avatar's speech.

Pipeline: Daily (user mic) -> Deepgram STT -> OpenAI LLM -> Cartesia TTS -> Anam
avatar, published directly into the Daily room by AnamTransport.

The TTS is a DirectorCueCartesiaTTSService: assistant text may contain inline
[tag] cues; they're sent to Cartesia as-is, and Cartesia echoes each back in its
word timestamps so the cue can be sent to the Anam engine over the data channel
via transport.send_director_note_cue(tag, at_seconds=...), timed to the marked word.

Env: ANAM_API_KEY, ANAM_AVATAR_ID, DAILY_ROOM_URL, DEEPGRAM_API_KEY,
CARTESIA_API_KEY, OPENAI_API_KEY (+ optional DAILY_*_TOKEN,
ANAM_AVATAR_MODEL). Open DAILY_ROOM_URL in a browser to talk to the avatar.
"""

import asyncio
import os
import sys

from anam import PersonaConfig
from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import TTSSpeakFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContext,
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat_anam import AnamTransport

from cues import CUE_TAGS
from director_cue_tts import DirectorCueCartesiaTTSService

load_dotenv(override=True)
logger.remove(0)
logger.add(sys.stderr, level="INFO")

SYSTEM = (
    "You are a warm, upbeat voice assistant. Keep replies to one or two sentences. "
    "You can add performance cues inline as [tag] just before the word you want to "
    "color; the tag itself is not read aloud. Use them sparingly, only when they fit. "
    "Valid tags: " + ", ".join(sorted(CUE_TAGS)) + ". "
    'Example: "That is [happy] wonderful! But be [concerned] careful with the total."'
)

# Spoken verbatim on connect so you can see the cues fire without waiting on the LLM.
SCRIPTED_GREETING = (
    "[warm] Hi there! It is so good to see you. "
    "[concerned] Honestly, I could not stop [laughter] laughing at that story earlier."
)


async def main() -> None:
    transport = AnamTransport(
        api_key=os.environ["ANAM_API_KEY"],
        persona_config=PersonaConfig(
            avatar_id=os.environ["ANAM_AVATAR_ID"],
            # Director-note cues require a Cara-4 avatar.
            avatar_model=os.getenv("ANAM_AVATAR_MODEL", "cara-4") or None,
            enable_audio_passthrough=True,
        ),
        daily_room_url=os.environ["DAILY_ROOM_URL"],
        daily_avatar_token=os.getenv("DAILY_AVATAR_TOKEN"),
        daily_bot_token=os.getenv("DAILY_BOT_TOKEN"),
        daily_avatar_user_name=os.getenv("DAILY_AVATAR_USER_NAME"),
    )

    stt = DeepgramSTTService(api_key=os.environ["DEEPGRAM_API_KEY"])

    tts = DirectorCueCartesiaTTSService(
        api_key=os.environ["CARTESIA_API_KEY"],
        # Cues are sent to the Anam engine over the data channel as words are timed.
        on_cue=transport.send_director_note_cue,
        settings=CartesiaTTSService.Settings(
            voice="e8e5fffb-252c-436d-b842-8879b84445b6",
        ),
    )

    llm = OpenAILLMService(api_key=os.environ["OPENAI_API_KEY"], model="gpt-4.1")

    # OpenAI takes the system prompt as a context message, not a constructor arg.
    context = LLMContext(messages=[{"role": "system", "content": SYSTEM}])
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_aggregator,
            llm,
            tts,
            transport.output(),
            assistant_aggregator,
        ]
    )

    task = PipelineTask(pipeline, params=PipelineParams(enable_metrics=True))

    @transport.event_handler("on_avatar_connected")
    async def on_avatar_connected(transport, participant):
        logger.info("Avatar connected; speaking scripted greeting with cues")
        # The [tag] cues go straight to Cartesia; it echoes each one back in its word
        # timestamps and DirectorCueCartesiaTTSService fires the Anam cue from there.
        await task.queue_frames([TTSSpeakFrame(SCRIPTED_GREETING)])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, participant):
        logger.info("Client disconnected")
        await task.cancel()

    await PipelineRunner().run(task)


if __name__ == "__main__":
    asyncio.run(main())
