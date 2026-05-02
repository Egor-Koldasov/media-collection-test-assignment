"use client"

import { Mat4 } from "./Mat4"

export const mat4TransformByAngleX = (angle: number): Mat4 => {
  const angleRad = (angle * Math.PI) / 180
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return [1, 0, 0, 0, 0, cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1]
}
