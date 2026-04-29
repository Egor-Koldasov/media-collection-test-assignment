"use client";

import { useCanvasDemo } from "@/lib/use-canvas-demo";

const setup = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl2");

  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.");
  }
};

export function Demo1() {
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
