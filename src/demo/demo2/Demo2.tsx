"use client"

import { useCanvasDemo } from "@/lib/use-canvas-demo"
import { compileShader } from "../../lib/webgl/compileShader"
import { createProgram } from "../../lib/webgl/createProgram"
import { resizeCanvasToDisplaySize } from "../../lib/canvas"
import Link from "next/link"
import { letterFPositions, letterFZPositions } from "./objects/letterF"
import { Mat4 } from "../../lib/math/mat4/Mat4"
import { mat4Mult } from "../../lib/math/mat4/mat4Mult"
import { mat4TransformScale } from "../../lib/math/mat4/mat4TransformScale"
import { mat4Id } from "../../lib/math/mat4/mat4Id"
import { xAxisPositions, yAxisPositions, zAxisPositions } from "./objects/axis"
import { mat4TransformByAngleX } from "../../lib/math/mat4/mat4TransformByAngleX"
import { mat4TransformByAngleY } from "../../lib/math/mat4/mat4TransformByAngleY"
import { mat4TransformByAngleZ } from "../../lib/math/mat4/mat4TransformByAngleZ"
import { proxy, useSnapshot } from "valtio"

const vertexShaderSource = `#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
// pixel length of a single length unit
uniform mat4 u_transform;
 
// all shaders have a main function
void main() {
  gl_Position = u_transform * a_position;
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

const state = proxy({
  rotateX: 0,
  rotateY: 45,
  rotateZ: 0,
})

function checkGLError(gl: WebGL2RenderingContext, label: string) {
  const error = gl.getError()

  if (error !== gl.NO_ERROR) {
    console.error(`${label}: WebGL error`, error)
  }
}

const axisSize = 10
const dpr = () => window.devicePixelRatio || 1

type ColorV = [number, number, number, number]

const randomColor = (): ColorV => [
  Math.random(),
  Math.random(),
  Math.random(),
  1,
]

type DrawOpts = {
  transform?: Mat4
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

const spaceClip = () => mat4Id()
const spacePixel = (width: number, height: number, depth?: number) =>
  mat4Mult(transformByPixelScale(width, height, depth ?? height), spaceClip())
const spaceUnit = (unitPixelSize: number) =>
  mat4Mult(
    mat4TransformScale(unitPixelSize, unitPixelSize, unitPixelSize),
    spacePixel(1, 1),
  )

const spaces = {
  clip: spaceClip(),
  pixel: spacePixel,
  unit: spaceUnit,
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
    3, // size (num components)
    gl.FLOAT, // type of data in buffer
    false, // normalize
    0, // stride (0 = compute from size and type)
    0, // offset in buffer
  )
  return {
    vao,
    draw: () => {
      const { transform = mat4Id() } = getDrawOpts()

      // 1 unit = 20 CSS pixels
      const unitScale = 40 * dpr()

      const transformInput = mat4Mult(
        transform,

        transformByPixelScale(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.height,
        ),
        mat4TransformScale(
          unitScale * scale,
          unitScale * scale,
          unitScale * scale,
        ),
      )
      gl.bindVertexArray(vao)
      gl.uniform4fv(gl.getUniformLocation(program, "u_color"), color)
      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "u_transform"),
        false,
        transformInput,
      )

      gl.drawArrays(primitiveType, 0, positions.length / 3)
      checkGLError(gl, "drawArrays")
    },
  }
}

// Scale matrix from 1 width, 1 height unit to 1 pixel unit
const transformByPixelScale = (
  width: number,
  height: number,
  depth: number,
): Mat4 => mat4TransformScale(2 / width, 2 / height, 2 / depth)

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
  // const rectConf = bindVao({
  //   gl,
  //   program,
  //   positions: rectPositions,
  //   getDrawOpts: () => {
  //     const scaleDuration = 1000
  //     const scale =
  //       1 -
  //       Math.abs(((Date.now() % (scaleDuration * 2)) / scaleDuration - 1) * 0.7)
  //     return {
  //       transform: mat4Mult(
  //         mat3TransformTranslate(-7.5, -5),
  //         mat3TransformScale(scale),
  //         transformByAngle(-Math.floor((Date.now() / 100) * 10) % 360),
  //         mat3TransformTranslate(7.5, 5),
  //       ),
  //     }
  //   },
  // })

  const getDrawOpts = () => {
    let viewportAngle = 45

    viewportAngle = viewportAngle + 1

    const viewport = mat4Mult(
      mat4TransformByAngleX(state.rotateX),
      mat4TransformByAngleY(state.rotateY),
      mat4TransformByAngleZ(state.rotateZ),
    )
    return { transform: viewport }
  }

  const letterFConf = bindVao({
    gl,
    program,
    positions: letterFPositions,
    scale: 0.01,
    getDrawOpts: () => {
      // const scaleDuration = 1000
      // const scale =
      //   1 -
      //   Math.abs(((Date.now() % (scaleDuration * 2)) / scaleDuration - 1) * 0.7)
      return {
        transform: mat4Mult(
          // mat4TransformTranslate(-7.5, -5),
          mat4TransformScale(1, -1, 1),
          getDrawOpts().transform,
          // mat4TransformTranslate(-30, 0, 0),
          // transformByAngle(-Math.floor((Date.now() / 100) * 10) % 360),
          // mat3TransformTranslate(7.5, 5),
        ),
      }
    },
  })
  const letterFZConf = bindVao({
    gl,
    program,
    positions: letterFZPositions,
    scale: 0.01,
    getDrawOpts: () => {
      // const scaleDuration = 1000
      // const scale =
      //   1 -
      //   Math.abs(((Date.now() % (scaleDuration * 2)) / scaleDuration - 1) * 0.7)
      return {
        transform: mat4Mult(
          // mat4TransformTranslate(-7.5, -5),
          mat4TransformScale(1, -1, 1),
          getDrawOpts().transform,
          // mat4TransformTranslate(-30, 0, 0),
          // transformByAngle(-Math.floor((Date.now() / 100) * 10) % 360),
          // mat3TransformTranslate(7.5, 5),
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
      color: [0.5, 0, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      positions: yAxisPositions,
      scale: axisSize,
      color: [0, 0.5, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      positions: zAxisPositions,
      scale: axisSize,
      color: [0.5, 0.5, 0.5, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      positions: xAxisPositions,
      color: [1, 0, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      positions: yAxisPositions,
      color: [0, 1, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      positions: zAxisPositions,
      color: [1, 1, 1, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    // rectConf,
    letterFConf,
    letterFZConf,
  ]

  const render = () => {
    resizeCanvasToDisplaySize(canvas)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)

    for (const drawConfig of drawConfigs) {
      drawConfig.draw()
    }
    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)
}

export function Demo2() {
  const { ariaLabel, canvasRef, error } = useCanvasDemo(
    setup,
    "Raw WebGL2 triangle demo",
    undefined,
  )
  const snap = useSnapshot(state)

  return (
    <>
      Demo 2: 3D WebGL basics <Link href="/">Back</Link>
      <div>
        <div>
          <input
            type="range"
            min={0}
            max={360}
            value={snap.rotateX}
            onChange={(e) => (state.rotateX = Number(e.target.value))}
          />
          X: {snap.rotateX}
        </div>
        <div>
          <input
            type="range"
            min={0}
            max={360}
            value={snap.rotateY}
            onChange={(e) => (state.rotateY = Number(e.target.value))}
          />
          Y: {snap.rotateY}
        </div>
        <div>
          <input
            type="range"
            min={0}
            max={360}
            value={snap.rotateZ}
            onChange={(e) => (state.rotateZ = Number(e.target.value))}
          />
          Z: {snap.rotateZ}
        </div>
      </div>
      <canvas aria-label={ariaLabel} className="demo-canvas" ref={canvasRef} />
      {error && <p className="error">{error}</p>}
    </>
  )
}
