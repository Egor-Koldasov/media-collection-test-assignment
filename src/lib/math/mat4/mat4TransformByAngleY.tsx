"use client"

import { Mat4 } from "./Mat4"

export const mat4TransformByAngleY = (angle: number): Mat4 => {
  const angleRad = (angle * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return [cos, 0, -sin, 0, 0, 1, 0, 0, sin, 0, cos, 0, 0, 0, 0, 1]
}
