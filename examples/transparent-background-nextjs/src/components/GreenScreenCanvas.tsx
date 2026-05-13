"use client";

import { useEffect, useRef } from "react";

export type KeySettings = {
  minGreen: number;
  greenBias: number;
  softness: number;
  spill: number;
};

type GreenScreenCanvasProps = {
  videoElementId: string;
  fallbackImageSrc: string;
  isStreaming: boolean;
  settings: KeySettings;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyGreenScreenKey(frame: ImageData, settings: KeySettings) {
  const pixels = frame.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const minChannel = Math.min(red, green, blue);
    const maxRedBlue = Math.max(red, blue);
    const maxChannel = Math.max(red, green, blue);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
    const greenDominance = green - maxRedBlue;
    const keyRamp = Math.max(8, settings.softness * 0.55);
    const isGreen =
      green === maxChannel &&
      green > settings.minGreen &&
      green > red * settings.greenBias &&
      green > blue * settings.greenBias &&
      saturation > 0.08 &&
      greenDominance > 2;

    if (isGreen) {
      const keyedAmount = clamp(
        (greenDominance - 2) / keyRamp + (saturation - 0.08) * 1.8,
        0,
        1,
      );
      pixels[index + 3] = Math.round(255 * (1 - keyedAmount));
    } else if (greenDominance > 8 && green > 70) {
      pixels[index + 1] = Math.round(
        green - greenDominance * settings.spill,
      );
    }
  }

  return frame;
}

export function GreenScreenCanvas({
  videoElementId,
  fallbackImageSrc,
  isStreaming,
  settings,
}: GreenScreenCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new Image();
    image.src = fallbackImageSrc;
    imageRef.current = image;
  }, [fallbackImageSrc]);

  useEffect(() => {
    let frameId = 0;
    let lastDrawTime = 0;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });

    if (!canvas || !context) return;

    const targetCanvas = canvas;
    const targetContext = context;

    function drawSource(source: HTMLVideoElement | HTMLImageElement) {
      const sourceWidth =
        source instanceof HTMLVideoElement
          ? source.videoWidth
          : source.naturalWidth;
      const sourceHeight =
        source instanceof HTMLVideoElement
          ? source.videoHeight
          : source.naturalHeight;

      if (!sourceWidth || !sourceHeight) return;

      const targetWidth = 720;
      const targetHeight = Math.round((targetWidth * sourceHeight) / sourceWidth);

      if (
        targetCanvas.width !== targetWidth ||
        targetCanvas.height !== targetHeight
      ) {
        targetCanvas.width = targetWidth;
        targetCanvas.height = targetHeight;
      }

      targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      targetContext.drawImage(
        source,
        0,
        0,
        targetCanvas.width,
        targetCanvas.height,
      );

      const frame = targetContext.getImageData(
        0,
        0,
        targetCanvas.width,
        targetCanvas.height,
      );
      targetContext.putImageData(applyGreenScreenKey(frame, settings), 0, 0);
    }

    function draw(now: number) {
      const video = document.getElementById(
        videoElementId,
      ) as HTMLVideoElement | null;

      if (now - lastDrawTime < 42) {
        frameId = window.requestAnimationFrame(draw);
        return;
      }

      lastDrawTime = now;

      if (isStreaming && video && video.readyState >= 2) {
        drawSource(video);
      } else if (imageRef.current?.complete) {
        drawSource(imageRef.current);
      }

      frameId = window.requestAnimationFrame(draw);
    }

    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    isStreaming,
    settings,
    videoElementId,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="avatar-canvas"
      aria-label="Green-screen keyed Anam avatar"
    />
  );
}
