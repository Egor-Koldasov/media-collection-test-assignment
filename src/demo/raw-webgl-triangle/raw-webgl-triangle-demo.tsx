"use client";

import { useCallback } from "react";
import { resizeCanvasToDisplaySize } from "@/lib/canvas";
import { useCanvasDemo } from "@/lib/use-canvas-demo";

const vertexShaderSource = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

out vec4 outColor;

void main() {
  outColor = vec4(0.62, 0.87, 0.78, 1.0);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string
) {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(log);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
  );
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create shader program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "Unknown program link error.";
    gl.deleteProgram(program);
    throw new Error(log);
  }

  return program;
}

export function RawWebglTriangleDemo() {
  const setup = useCallback((canvas: HTMLCanvasElement) => {
    const gl = canvas.getContext("webgl2");

    if (!gl) {
      throw new Error("WebGL2 is not available in this browser.");
    }

    let animationFrame = 0;

    const program = createProgram(gl);
    const vao = gl.createVertexArray();
    const positionBuffer = gl.createBuffer();
    const positions = new Float32Array([0, 0.72, -0.68, -0.52, 0.68, -0.52]);

    if (!vao || !positionBuffer) {
      throw new Error("Unable to create vertex array or position buffer.");
    }

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const render = () => {
      const { width, height } = resizeCanvasToDisplaySize(canvas);

      gl.viewport(0, 0, width, height);
      gl.clearColor(0.035, 0.035, 0.035, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      animationFrame = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      gl.deleteBuffer(positionBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, []);
  const { ariaLabel, canvasRef } = useCanvasDemo(
    setup,
    "Raw WebGL2 triangle demo"
  );

  return (
    <canvas
      aria-label={ariaLabel}
      className="demo-canvas"
      ref={canvasRef}
    />
  );
}
