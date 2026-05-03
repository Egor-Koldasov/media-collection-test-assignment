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
import { mat4TransformTranslate } from "../../lib/math/mat4/mat4TransformTranslate"

const vertexShaderSource = `#version 300 es
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
// pixel length of a single length unit
uniform mat4 u_transform;
float u_fudgeFactor;
 
// all shaders have a main function
void main() {
  u_fudgeFactor = 40.0;
  vec4 position = u_transform * a_position;
  float zToDivideBy = 1.0 + position.z * u_fudgeFactor;
  gl_Position = vec4(position.xyz / zToDivideBy, zToDivideBy);
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

const spaceClip = () => mat4Id()
type SpacePixelOpts = {
  pixel: { width: number; height: number; depth?: number }
}
const spacePixel = (opts: SpacePixelOpts) =>
  mat4Mult(
    spaceClip(),
    mat4TransformScale(
      2 / opts.pixel.width,
      2 / opts.pixel.height,
      2 / (opts.pixel.depth ?? opts.pixel.height),
    ),
  )
type SpaceUnitOpts = SpacePixelOpts & {
  unit: { unitPixelSize: number }
}
const spaceUnit = (opts: SpaceUnitOpts) =>
  mat4Mult(
    spacePixel(opts),
    mat4TransformScale(
      opts.unit.unitPixelSize,
      opts.unit.unitPixelSize,
      opts.unit.unitPixelSize,
    ),
  )

const spaces = {
  clip: spaceClip,
  pixel: spacePixel,
  unit: spaceUnit,
}
type Space = keyof typeof spaces

type DrawOpts = {
  positionTransform?: Mat4
}

type BindVaoOpts = {
  gl: WebGL2RenderingContext
  program: WebGLProgram
  vertices: Float32Array
  primitiveType?: number
  color?: ColorV
  space?: Space
  getDrawOpts?: (conf: BindVaoOpts) => DrawOpts
  /**
   * This should normilize `positions`. Origin should be at the object's center.
   * The size should be normilized to unit space.
   */
  modelTransform?: Mat4
}

export const bindVao = (opts: BindVaoOpts) => {
  const {
    gl,
    program,
    vertices: positions,
    primitiveType = gl.TRIANGLES,
    color = randomColor(),
    getDrawOpts = (): DrawOpts => ({}),
    space = "unit",
    modelTransform = mat4Id(),
  } = opts
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
      const { positionTransform = mat4Id() } = getDrawOpts(opts)

      // 1 unit = 20 CSS pixels
      const unitScale = 40 * dpr()

      const spaceTransform = spaces[space]({
        pixel: {
          width: gl.canvas.width,
          height: gl.canvas.height,
          depth: unitScale * 1000,
        },
        unit: {
          unitPixelSize: unitScale,
        },
      })

      const transformInput = mat4Mult(
        spaceTransform,
        positionTransform,
        modelTransform,
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

  // gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

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

  const getDrawOpts = (confOpts: BindVaoOpts) => {
    if (confOpts.space === "unit" || !confOpts.space) {
      let viewportAngle = 45

      viewportAngle = viewportAngle + 1

      const viewport = mat4Mult(
        mat4TransformByAngleX(state.rotateX),
        mat4TransformByAngleY(state.rotateY),
        mat4TransformByAngleZ(state.rotateZ),
      )
      return { positionTransform: viewport }
    }

    return { positionTransform: mat4Id() }
  }

  const fScale = 0.03

  const letterFConf = bindVao({
    gl,
    program,
    vertices: letterFPositions,
    modelTransform: mat4Mult(
      mat4TransformScale(fScale, -fScale, fScale),
      mat4TransformTranslate(-50, -75, 0),
    ),
    getDrawOpts,
  })
  const letterFZConf = bindVao({
    gl,
    program,
    vertices: letterFPositions,
    modelTransform: mat4Mult(
      mat4TransformScale(fScale, -fScale, fScale),
      mat4TransformByAngleY(-90),
      mat4TransformTranslate(0, -75, 50),
    ),
    getDrawOpts,
  })
  const drawConfigs = [
    bindVao({
      gl,
      program,
      vertices: xAxisPositions,
      space: "clip",
      color: [0.5, 0, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      vertices: yAxisPositions,
      space: "clip",
      color: [0, 0.5, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      vertices: zAxisPositions,
      space: "clip",
      color: [0.5, 0.5, 0.5, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      vertices: xAxisPositions,
      color: [1, 0, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      vertices: yAxisPositions,
      color: [0, 1, 0, 1],
      primitiveType: gl.LINES,
      getDrawOpts,
    }),
    bindVao({
      gl,
      program,
      vertices: zAxisPositions,
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
