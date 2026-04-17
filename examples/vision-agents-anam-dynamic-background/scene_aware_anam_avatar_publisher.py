import asyncio
import logging
from pathlib import Path

import av
import numpy as np
from PIL import Image
from vision_agents.plugins.anam import AnamAvatarPublisher

logger = logging.getLogger(__name__)

SCENE_ALIASES = {
    "cook": "kitchen",
    "cooking": "kitchen",
    "recipe": "kitchen",
    "presentation": "studio",
}


class SceneAwareAnamAvatarPublisher(AnamAvatarPublisher):
    """Anam avatar publisher with chroma-key background replacement."""

    name = "scene_aware_anam_avatar"

    def __init__(
        self,
        background_dir: str,
        base_scene: str = "office",
        green_threshold: int = 88,
        green_bias: float = 1.14,
        green_tolerance: int = 22,
        edge_expand: int = 1,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._scene_lock = asyncio.Lock()
        self._backgrounds = self._load_backgrounds(Path(background_dir))
        self._resized_background_cache: dict[tuple[str, int, int], np.ndarray] = {}
        self._green_threshold = green_threshold
        self._green_bias = green_bias
        self._green_tolerance = max(0, green_tolerance)
        self._edge_expand = max(0, edge_expand)

        normalized_base = self._normalize_scene(base_scene)
        if normalized_base not in self._backgrounds:
            raise ValueError(
                f"Base scene '{base_scene}' was not found. Available scenes: "
                f"{', '.join(sorted(self._backgrounds.keys()))}"
            )
        self._base_scene = normalized_base
        self._current_scene = normalized_base

    async def set_scene(self, scene: str) -> str:
        """Set the active background scene."""
        normalized = self._normalize_scene(scene)
        if normalized not in self._backgrounds:
            available = ", ".join(sorted(self._backgrounds.keys()))
            raise ValueError(
                f"Unknown scene '{scene}'. Choose one of: {available}"
            )

        async with self._scene_lock:
            self._current_scene = normalized

        logger.info("Switched scene to '%s'", normalized)
        return normalized

    async def reset_scene(self) -> str:
        """Reset to the configured base background scene."""
        return await self.set_scene(self._base_scene)

    def available_scenes(self) -> list[str]:
        """Return all available scene names."""
        return sorted(self._backgrounds.keys())

    async def _video_receiver(self) -> None:
        async for frame in self._session.video_frames():
            try:
                composited = await self._apply_background(frame)
                await self._sync.write_video(composited)
            except Exception:
                logger.warning("Failed to composite frame", exc_info=True)
                await self._sync.write_video(frame)

    async def _apply_background(self, frame: av.VideoFrame) -> av.VideoFrame:
        source = frame.to_ndarray(format="rgb24")
        height, width, _ = source.shape

        async with self._scene_lock:
            scene = self._current_scene

        background = self._get_resized_background(scene, width, height)
        mask = self._make_green_screen_mask(source)

        composited = source.copy()
        composited[mask] = background[mask]

        output = av.VideoFrame.from_ndarray(composited, format="rgb24")
        output.pts = frame.pts
        output.time_base = frame.time_base
        return output

    def _make_green_screen_mask(self, source: np.ndarray) -> np.ndarray:
        red = source[:, :, 0].astype(np.int16)
        green = source[:, :, 1].astype(np.int16)
        blue = source[:, :, 2].astype(np.int16)

        strict_mask = (green > self._green_threshold) & (
            (green > red * self._green_bias) & (green > blue * self._green_bias)
        )

        tolerant_threshold = max(0, self._green_threshold - self._green_tolerance)
        tolerant_bias = max(1.0, self._green_bias - 0.2)
        tolerant_mask = (green > tolerant_threshold) & (
            (green > red * tolerant_bias) & (green > blue * tolerant_bias)
        )

        # Keep tolerant replacement near strict-keyed areas so JPEG spill around edges
        # gets removed without aggressively cutting into foreground details.
        if self._edge_expand == 0:
            return strict_mask
        expanded_strict_mask = self._expand_mask(strict_mask, self._edge_expand)
        return strict_mask | (tolerant_mask & expanded_strict_mask)

    def _expand_mask(self, mask: np.ndarray, iterations: int) -> np.ndarray:
        expanded = mask
        for _ in range(iterations):
            padded = np.pad(expanded, 1, mode="edge")
            expanded = (
                padded[1:-1, 1:-1]
                | padded[:-2, 1:-1]
                | padded[2:, 1:-1]
                | padded[1:-1, :-2]
                | padded[1:-1, 2:]
                | padded[:-2, :-2]
                | padded[:-2, 2:]
                | padded[2:, :-2]
                | padded[2:, 2:]
            )
        return expanded

    def _get_resized_background(self, scene: str, width: int, height: int) -> np.ndarray:
        key = (scene, width, height)
        cached = self._resized_background_cache.get(key)
        if cached is not None:
            return cached

        image = self._backgrounds[scene]
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        resized_array = np.asarray(resized.convert("RGB"), dtype=np.uint8)
        self._resized_background_cache[key] = resized_array
        return resized_array

    def _normalize_scene(self, scene: str) -> str:
        normalized = scene.strip().lower().replace("-", "_").replace(" ", "_")
        return SCENE_ALIASES.get(normalized, normalized)

    def _load_backgrounds(self, background_dir: Path) -> dict[str, Image.Image]:
        if not background_dir.exists():
            raise ValueError(f"Background directory does not exist: {background_dir}")

        backgrounds: dict[str, Image.Image] = {}
        for image_path in sorted(background_dir.glob("*")):
            if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            scene_name = image_path.stem.lower()
            backgrounds[scene_name] = Image.open(image_path)

        if not backgrounds:
            raise ValueError(
                f"No backgrounds found in {background_dir}. "
                "Add at least one .png or .jpg image."
            )
        return backgrounds
