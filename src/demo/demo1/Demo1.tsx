"use client"

import { useCanvasDemo } from "@/lib/use-canvas-demo"
import { compileShader } from "../../lib/webgl/compileShader"
import { createProgram } from "../../lib/webgl/createProgram"
import { resizeCanvasToDisplaySize } from "../../lib/canvas"
import { xAxisPositions, yAxisPositions } from "./objects/axis"
import { rectPositions } from "./objects/rectangle"
import Link from "next/link"
import { Mat3 } from "../../lib/math/mat3/Mat3"
import { mat3Mult } from "../../lib/math/mat3/mat3Mult"
import { mat3TransformScale } from "../../lib/math/mat3/mat3TransformScale"
import { mat3TransformTranslate } from "../../lib/math/mat3/mat3TransformTranslate"

const vertexShaderSource = `#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
// pixel length of a single length unit
uniform mat3 u_transform;
 
// all shaders have a main function
void main() {
  gl_Position = vec4((u_transform * vec3(a_position, 1)).xy, 0, 1);
}
`

const fragmentShaderSource = `#version 300 es
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;
uniform vec4 u_color;
 
// we need to declare an output for the fragment shader
out vec4 outColor;
 
void main() {
  // Just set the output to a constant reddish-purple
  outColor = u_color;
}
`

function checkGLError(gl: WebGL2RenderingContext, label: string) {
  const error = gl.getError()

  if (error !== gl.NO_ERROR) {
    console.error(`${label}: WebGL error`, error)
  }
}

const axisSize = 100
const dpr = () => window.devicePixelRatio || 1

type ColorV = [number, number, number, number]

const randomColor = (): ColorV => [
  Math.random(),
  Math.random(),
  Math.random(),
  1,
]

type DrawOpts = {
  transform?: Mat3
}

type BindVaoOpts = {
  gl: WebGL2RenderingContext
  program: WebGLProgram
  positions: Float32Array
  scale?: number
  primitiveType?: number
  color?: ColorV
  getDrawOpts?: () => DrawOpts
}

export const bindVao = ({
  gl,
  program,
  positions,
  scale = 1,
  primitiveType = gl.TRIANGLES,
  color = randomColor(),
  getDrawOpts = (): DrawOpts => ({}),
}: BindVaoOpts) => {
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position")
  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  gl.enableVertexAttribArray(positionAttributeLocation)
  gl.vertexAttribPointer(
    positionAttributeLocation,
    2, // size (num components)
    gl.FLOAT, // type of data in buffer
    false, // normalize
    0, // stride (0 = compute from size and type)
    0, // offset in buffer
  )
  return {
    vao,
    draw: () => {
      const { transform = [1, 0, 0, 0, 1, 0, 0, 0, 1] } = getDrawOpts()

      // 1 unit = 20 CSS pixels
      const unitScale = 20 * dpr()

      const transformInput = mat3Mult(
        transform,
        mat3TransformScale(unitScale * scale, unitScale * scale),
        transformByPixelScale(gl.canvas.width, gl.canvas.height),
      )
      gl.bindVertexArray(vao)
      gl.uniform4fv(gl.getUniformLocation(program, "u_color"), color)
      gl.uniformMatrix3fv(
        gl.getUniformLocation(program, "u_transform"),
        false,
        transformInput,
      )

      gl.drawArrays(primitiveType, 0, positions.length / 2)
      checkGLError(gl, "drawArrays")
    },
  }
}

// Scale matrix from 1 width, 1 height unit to 1 pixel unit
const transformByPixelScale = (width: number, height: number): Mat3 =>
  mat3TransformScale(1 / width, 1 / height)

const transformByAngle = (angle: number): Mat3 => {
  const angleRad = (angle * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return [cos, -sin, 0, sin, cos, 0, 0, 0, 1]
}

const setup = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl2")

  if (!gl) {
    throw new Error("WebGL2 is not available in this browser.")
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  )

  const program = createProgram(gl, vertexShader, fragmentShader)
  const axisColor: ColorV = [0.5, 0, 0, 1]
  const unitColor: ColorV = [0, 1, 0, 1]
  const rectConf = bindVao({
    gl,
    program,
    positions: rectPositions,
    getDrawOpts: () => {
      const scaleDuration = 1000
      const scale =
        1 -
        Math.abs(((Date.now() % (scaleDuration * 2)) / scaleDuration - 1) * 0.7)
      return {
        transform: mat3Mult(
          mat3TransformTranslate(-7.5, -5),
          mat3TransformScale(scale),
          transformByAngle(-Math.floor((Date.now() / 100) * 10) % 360),
          mat3TransformTranslate(7.5, 5),
        ),
      }
    },
  })
  const drawConfigs = [
    bindVao({
      gl,
      program,
      positions: xAxisPositions,
      scale: axisSize,
      color: axisColor,
      primitiveType: gl.LINES,
    }),
    bindVao({
      gl,
      program,
      positions: yAxisPositions,
      scale: axisSize,
      color: axisColor,
      primitiveType: gl.LINES,
    }),
    bindVao({
      gl,
      program,
      positions: xAxisPositions,
      color: unitColor,
      primitiveType: gl.LINES,
    }),
    bindVao({
      gl,
      program,
      positions: yAxisPositions,
      color: unitColor,
      primitiveType: gl.LINES,
    }),
    rectConf,
  ]

  const render = () => {
    resizeCanvasToDisplaySize(canvas)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)

    for (const drawConfig of drawConfigs) {
      drawConfig.draw()
    }
    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)
}

export function Demo1() {
  const { ariaLabel, canvasRef, error } = useCanvasDemo(
    setup,
    "Raw WebGL2 triangle demo",
  )

  return (
    <>
      Demo 1: Rotation <Link href="/">Back</Link>
      <canvas aria-label={ariaLabel} className="demo-canvas" ref={canvasRef} />
      {error && <p className="error">{error}</p>}
    </>
  )
}
