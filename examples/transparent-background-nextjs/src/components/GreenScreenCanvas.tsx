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

const vertexShaderSource = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = `
precision mediump float;

uniform sampler2D u_source;
uniform float u_minGreen;
uniform float u_greenBias;
uniform float u_softness;
uniform float u_spill;

varying vec2 v_texCoord;

void main() {
  vec4 texel = texture2D(u_source, v_texCoord);
  float red = texel.r * 255.0;
  float green = texel.g * 255.0;
  float blue = texel.b * 255.0;
  float minChannel = min(red, min(green, blue));
  float maxRedBlue = max(red, blue);
  float maxChannel = max(red, max(green, blue));
  float saturation = maxChannel == 0.0
    ? 0.0
    : (maxChannel - minChannel) / maxChannel;
  float greenDominance = green - maxRedBlue;
  float keyRamp = max(8.0, u_softness * 0.55);
  bool isGreen =
    green == maxChannel &&
    green > u_minGreen &&
    green > red * u_greenBias &&
    green > blue * u_greenBias &&
    saturation > 0.08 &&
    greenDominance > 2.0;

  vec3 color = texel.rgb;
  float alpha = texel.a;

  if (isGreen) {
    float keyedAmount = clamp(
      (greenDominance - 2.0) / keyRamp + (saturation - 0.08) * 1.8,
      0.0,
      1.0
    );
    alpha = texel.a * (1.0 - keyedAmount);
  } else if (greenDominance > 8.0 && green > 70.0) {
    color.g = max(0.0, green - greenDominance * u_spill) / 255.0;
  }

  gl_FragColor = vec4(color, alpha);
}
`;

type WebGlKeyer = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  texture: WebGLTexture;
  positionBuffer: WebGLBuffer;
  texCoordBuffer: WebGLBuffer;
  attributes: {
    position: number;
    texCoord: number;
  };
  uniforms: {
    source: WebGLUniformLocation | null;
    minGreen: WebGLUniformLocation | null;
    greenBias: WebGLUniformLocation | null;
    softness: WebGLUniformLocation | null;
    spill: WebGLUniformLocation | null;
  };
};

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create WebGL shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  );
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create WebGL program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown WebGL link error";
    gl.deleteProgram(program);
    throw new Error(message);
  }

  return program;
}

function createWebGlKeyer(canvas: HTMLCanvasElement): WebGlKeyer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
  });

  if (!gl) return null;

  const program = createProgram(gl);
  const positionBuffer = gl.createBuffer();
  const texCoordBuffer = gl.createBuffer();
  const texture = gl.createTexture();

  if (!positionBuffer || !texCoordBuffer || !texture) {
    throw new Error("Unable to create WebGL buffers");
  }

  gl.useProgram(program);

  const position = gl.getAttribLocation(program, "a_position");
  const texCoord = gl.getAttribLocation(program, "a_texCoord");

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1,
    ]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(texCoord);
  gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 0, 0);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.clearColor(0, 0, 0, 0);

  const uniforms = {
    source: gl.getUniformLocation(program, "u_source"),
    minGreen: gl.getUniformLocation(program, "u_minGreen"),
    greenBias: gl.getUniformLocation(program, "u_greenBias"),
    softness: gl.getUniformLocation(program, "u_softness"),
    spill: gl.getUniformLocation(program, "u_spill"),
  };

  gl.uniform1i(uniforms.source, 0);

  return {
    gl,
    program,
    texture,
    positionBuffer,
    texCoordBuffer,
    attributes: {
      position,
      texCoord,
    },
    uniforms,
  };
}

function setCanvasSize(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  sourceWidth: number,
  sourceHeight: number,
) {
  const targetWidth = 720;
  const targetHeight = Math.round((targetWidth * sourceHeight) / sourceWidth);

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
}

function destroyKeyer(keyer: WebGlKeyer) {
  keyer.gl.deleteTexture(keyer.texture);
  keyer.gl.deleteBuffer(keyer.positionBuffer);
  keyer.gl.deleteBuffer(keyer.texCoordBuffer);
  keyer.gl.deleteProgram(keyer.program);
}

export function GreenScreenCanvas({
  videoElementId,
  fallbackImageSrc,
  isStreaming,
  settings,
}: GreenScreenCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    const image = new Image();
    image.src = fallbackImageSrc;
    imageRef.current = image;
  }, [fallbackImageSrc]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let frameId = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const keyer = createWebGlKeyer(canvas);
    if (!keyer) return;

    const activeKeyer = keyer;
    const { gl } = activeKeyer;

    function drawSource(source: HTMLVideoElement | HTMLImageElement) {
      const sourceWidth =
        source instanceof HTMLVideoElement
          ? source.videoWidth
          : source.naturalWidth;
      const sourceHeight =
        source instanceof HTMLVideoElement
          ? source.videoHeight
          : source.naturalHeight;

      if (!canvas || !sourceWidth || !sourceHeight) return;

      const currentSettings = settingsRef.current;

      setCanvasSize(canvas, gl, sourceWidth, sourceHeight);
      gl.useProgram(activeKeyer.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, activeKeyer.positionBuffer);
      gl.vertexAttribPointer(
        activeKeyer.attributes.position,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, activeKeyer.texCoordBuffer);
      gl.vertexAttribPointer(
        activeKeyer.attributes.texCoord,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, activeKeyer.texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
      gl.uniform1f(activeKeyer.uniforms.minGreen, currentSettings.minGreen);
      gl.uniform1f(activeKeyer.uniforms.greenBias, currentSettings.greenBias);
      gl.uniform1f(activeKeyer.uniforms.softness, currentSettings.softness);
      gl.uniform1f(activeKeyer.uniforms.spill, currentSettings.spill);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function draw() {
      const video = document.getElementById(
        videoElementId,
      ) as HTMLVideoElement | null;

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
      destroyKeyer(activeKeyer);
    };
  }, [
    isStreaming,
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
