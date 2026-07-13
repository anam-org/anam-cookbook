"""Parse a line annotated with [tag] markers into ordered segments, and align
each tag to a spoken-word time so it can become an Anam Director Notes cue.

The Anam cue tags drive the avatar's FACE, via
`session.send_director_note_cue(tag, at_seconds=...)`. The VOICE comes from
Cartesia's own reading of the text (Sonic interprets emotional subtext), with
the `[laughter]` non-verbal kept inline so the voice actually laughs.

Run this file directly to execute the self-check:  `uv run python cues.py`
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Anam Director Notes cue tags (steer the avatar's face). Beta.
# https://docs.anam.ai/personas/director-notes
ANAM_CUE_TAGS = {
    "happy", "warm", "playful", "curious", "supportive",
    "concerned", "sad", "surprised", "angry", "distressed", "laughter",
}

_TAG_RE = re.compile(r"\[([a-zA-Z_]{1,32})\]")


@dataclass
class Segment:
    """A span of text that opens with a cue tag (or None for the neutral opener)."""

    tag: str | None
    text: str

    @property
    def face_cue(self) -> str | None:
        """The Anam Director Notes cue to fire, if this tag is a known cue."""
        return self.tag if self.tag in ANAM_CUE_TAGS else None

    def cartesia_text(self) -> str:
        """Text to push to Cartesia — [laughter] is kept inline so the voice laughs."""
        prefix = "[laughter] " if self.tag == "laughter" else ""
        return (prefix + self.text).strip()


def parse_tagged_line(text: str) -> list[Segment]:
    """Split `text` at each `[tag]` into ordered Segments.

    Text before the first tag becomes a neutral (tag=None) opener. A trailing
    tag with no following words (e.g. "...amazing! [laughter]") is kept so the
    avatar can react at the end of the turn.
    """
    segments: list[Segment] = []
    pos = 0
    current: str | None = None
    for m in _TAG_RE.finditer(text):
        chunk = text[pos:m.start()].strip()
        if chunk or current is not None:
            segments.append(Segment(current, chunk))
        current = m.group(1).lower()
        pos = m.end()
    tail = text[pos:].strip()
    if tail or current is not None:
        segments.append(Segment(current, tail))
    return segments


def _norm(word: str) -> str:
    """Lowercase and strip punctuation so our words match Cartesia's word list."""
    return "".join(c for c in word.lower() if c.isalnum())


class CueTimer:
    """Turn a stream of Cartesia word timestamps into ordered face cues.

    `feed()` each batch of word timings as it streams in and it returns any cues
    whose segment just started; call `flush()` at the end for the rest. Each
    segment's cue is anchored to the start time of its first spoken word, found
    by matching *forward* through the word stream so a stray non-verbal token
    (e.g. Cartesia emitting "laughs" for our inline `[laughter]`) never desyncs
    the cues. `at_seconds` is relative to the start of the turn's audio.

    # ponytail: forward word-matching, not an exact index. Cartesia's tokenizer
    # (contractions, non-verbals) needn't match ours 1:1; matching real words
    # forward tolerates the drift. If cues ever land a word early/late, this is
    # the knob — anchoring at sentence starts keeps it visually imperceptible.
    """

    def __init__(self, segments: list[Segment]) -> None:
        self._segs = [
            (seg.face_cue, [w for w in (_norm(x) for x in seg.text.split()) if w])
            for seg in segments
        ]
        self._i = 0          # next segment to start
        self._remaining = 0  # words left to consume in the current segment
        self._last_end = 0.0  # end time of the last consumed word

    def feed(
        self, words: list[str], starts: list[float], ends: list[float]
    ) -> list[tuple[str, float]]:
        out: list[tuple[str, float]] = []
        for raw, start, end in zip(words, starts, ends):
            w = _norm(raw)
            if not w:
                continue
            if self._remaining > 0:  # still inside the current segment
                self._remaining -= 1
                self._last_end = end
                continue
            while self._i < len(self._segs):
                cue, seg_words = self._segs[self._i]
                if not seg_words:  # empty-text cue (e.g. trailing [laughter])
                    if cue:
                        out.append((cue, round(self._last_end, 3)))
                    self._i += 1
                    continue  # consumes no word; try the next segment for this word
                if w == seg_words[0]:  # the segment starts on this word
                    if cue:
                        out.append((cue, round(float(start), 3)))
                    self._remaining = len(seg_words) - 1
                    self._last_end = end
                    self._i += 1
                    break
                break  # stray token between segments; skip this word, keep segment
        return out

    def flush(self) -> list[tuple[str, float]]:
        """Emit cues for any segments left unstarted (empty or unmatched) at the end."""
        out: list[tuple[str, float]] = []
        while self._i < len(self._segs):
            cue, _ = self._segs[self._i]
            if cue:
                out.append((cue, round(self._last_end, 3)))
            self._i += 1
        return out


def anchor_cues(
    segments: list[Segment],
    words: list[str],
    starts: list[float],
    ends: list[float],
) -> list[tuple[str, float]]:
    """One-shot anchoring over the full word lists — a CueTimer fed all at once."""
    timer = CueTimer(segments)
    return timer.feed(words, starts, ends) + timer.flush()


def _self_check() -> None:
    # 1. Segmentation + neutral opener + trailing empty laughter
    segs = parse_tagged_line("[warm] Hi there. [curious] What's that noise? [laughter]")
    assert [(s.tag, s.text) for s in segs] == [
        ("warm", "Hi there."),
        ("curious", "What's that noise?"),
        ("laughter", ""),
    ], segs

    # 2. [laughter] is kept inline for the voice; other tags don't touch the text
    assert segs[2].cartesia_text() == "[laughter]"
    assert segs[0].cartesia_text() == "Hi there."

    # 3. Cue anchoring to first-word start times
    words = ["Hi", "there", "What's", "that", "noise"]
    starts = [0.0, 0.30, 0.80, 1.10, 1.40]
    ends = [0.30, 0.60, 1.10, 1.40, 1.90]
    cues = anchor_cues(segs, words, starts, ends)
    assert cues == [("warm", 0.0), ("curious", 0.8), ("laughter", 1.9)], cues

    # 4. Forward-matching tolerates a stray non-verbal token Cartesia may emit
    segs2 = parse_tagged_line("[warm] Hi there. [surprised] Surprised me.")
    words2 = ["Hi", "there", "laughs", "Surprised", "me"]  # stray "laughs" at idx 2
    starts2 = [0.0, 0.3, 0.6, 0.9, 1.2]
    ends2 = [0.3, 0.6, 0.9, 1.2, 1.5]
    cues2 = anchor_cues(segs2, words2, starts2, ends2)
    assert cues2 == [("warm", 0.0), ("surprised", 0.9)], cues2

    # 5. Unknown tags speak but emit no face cue; neutral opener has no cue
    segs3 = parse_tagged_line("Hello there. [wibble] general. [happy] good news!")
    assert segs3[0].tag is None and segs3[0].face_cue is None
    assert segs3[1].face_cue is None  # "wibble" not a known cue
    cues3 = anchor_cues(
        segs3,
        ["Hello", "there", "general", "good", "news"],
        [0.0, 0.3, 0.7, 1.1, 1.4],
        [0.3, 0.6, 1.0, 1.4, 1.8],
    )
    assert cues3 == [("happy", 1.1)], cues3

    # 6. Streaming: feeding words in batches matches a one-shot pass, and a cue
    #    is emitted as soon as its segment's first word arrives.
    timer = CueTimer(parse_tagged_line("[warm] Hi there. [surprised] Surprised me."))
    got = timer.feed(["Hi", "there"], [0.0, 0.3], [0.3, 0.6])
    assert got == [("warm", 0.0)], got  # emitted before the second segment arrives
    got += timer.feed(["laughs", "Surprised", "me"], [0.6, 0.9, 1.2], [0.9, 1.2, 1.5])
    got += timer.flush()
    assert got == [("warm", 0.0), ("surprised", 0.9)], got

    print("cues.py self-check passed")


if __name__ == "__main__":
    _self_check()
