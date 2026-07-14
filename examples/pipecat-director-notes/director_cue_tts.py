"""A Cartesia TTS service that fires Anam director-note cues from word timings.

An Anam director-note cue takes an ``at_seconds`` offset measured from the start of
the current speech turn. We leave the inline ``[tag]`` cues in the text we send to
Cartesia; Cartesia (sonic-3.5) streams word-level timestamps *as it generates
audio* — before playback — and echoes each inline ``[tag]`` marker back in that
stream at the moment it is spoken. So we read the marker's start time straight from
``add_word_timestamps`` and send the cue to the engine ahead of time. No stripping,
no anchor word, no matching — Cartesia does the timing for us.

The tag extraction lives in ``cues.py``; this file is the Pipecat glue.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from loguru import logger
from pipecat.services.cartesia.tts import CartesiaTTSService

from cues import cue_tags

# A cue callback: (tag, *, at_seconds) -> awaitable. AnamTransport.send_director_note_cue fits.
OnCue = Callable[..., Awaitable[None]]


class DirectorCueCartesiaTTSService(CartesiaTTSService):
    """CartesiaTTSService that emits Anam director-note cues on word timings."""

    def __init__(self, *args, on_cue: OnCue, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._on_cue = on_cue

    async def add_word_timestamps(self, word_times, context_id=None, *args, **kwargs) -> None:
        # add_word_timestamps is an internal base-class hook (not a public Pipecat event),
        # but it's the earliest place Cartesia's raw [(word, start), ...] timings surface —
        # ahead of playback. Cartesia echoes each inline [tag] back on its word token, so we
        # fire any cue we see at that word's start. Its signature can drift between Pipecat
        # versions: keep super() and pin a tested Pipecat; *args/**kwargs absorb extras.
        for word, at_seconds in word_times:
            for tag in cue_tags(word):
                await self._fire(tag, max(0.0, float(at_seconds)))
        await super().add_word_timestamps(word_times, context_id, *args, **kwargs)

    async def _fire(self, tag: str, at_seconds: float) -> None:
        try:
            await self._on_cue(tag, at_seconds=at_seconds)
            logger.debug(f"director-cue [{tag}] @ {at_seconds:.2f}s")
        except Exception as exc:  # session may not be active yet — never kill the pipeline
            logger.warning(f"director-cue [{tag}] not sent: {exc}")
