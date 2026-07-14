"""Anam director-note cue tags, and how to read them back from Cartesia timings.

Pure logic, no Pipecat imports, so it runs anywhere: ``python cues.py`` runs the
self-check. The Pipecat TTS service that uses it lives in ``director_cue_tts.py``.

Authoring: write cues inline as ``[tag]`` just before the word they should land on::

    "Well that's just [laughter] hilarious. But [concerned] honestly, check the numbers."

The tags are sent to Cartesia unchanged. Cartesia (sonic-3.5) echoes each inline
marker back in its word timestamps — on its own (``'[laughter]'``), or folded into
its word if you glue them (``'[laughter]hilarious.'``) — so the marker's start time
is exactly when it is spoken. ``cue_tags`` pulls the valid tag(s) out of each token.

Valid Anam cue tags (Cara-4): happy, warm, playful, curious, supportive,
concerned, sad, surprised, angry, distressed, laughter.
"""

from __future__ import annotations

import re

# The 11 director-note cue tags Anam accepts over the data channel.
CUE_TAGS = frozenset(
    {
        "happy",
        "warm",
        "playful",
        "curious",
        "supportive",
        "concerned",
        "sad",
        "surprised",
        "angry",
        "distressed",
        "laughter",
    }
)

_TAG_RE = re.compile(r"\[([a-zA-Z_]+)\]")


def cue_tags(token: str) -> list[str]:
    """Return the valid Anam cue tags carried by a Cartesia word-timestamp token.

    Cartesia echoes inline ``[tag]`` markers back in its timestamps: a spaced marker
    arrives as its own token (``'[warm]'``), a glued one folded into its word
    (``'[happy]wonderful'``); trailing punctuation rides along (``'[laughter]hi.'``).
    Either way the token's start time is when that point is spoken. Unknown tags are
    dropped. Stacked markers (``'[happy][playful]word'``) yield one tag each.
    """
    return [t for m in _TAG_RE.finditer(token) if (t := m.group(1).lower()) in CUE_TAGS]


if __name__ == "__main__":
    # ponytail: self-check for tag extraction from Cartesia tokens. `python cues.py`.
    assert cue_tags("[laughter]") == ["laughter"]
    assert cue_tags("[happy]wonderful") == ["happy"]  # glued to its word
    assert cue_tags("[concerned]Honestly,") == ["concerned"]  # trailing punctuation
    assert cue_tags("[laughter]hilarious.") == ["laughter"]
    assert cue_tags("[happy][playful]wonderful") == ["happy", "playful"]  # stacked
    assert cue_tags("[bogus]word") == []  # unknown tag dropped
    assert cue_tags("everyone") == []  # plain word
    print("cues self-check OK")
