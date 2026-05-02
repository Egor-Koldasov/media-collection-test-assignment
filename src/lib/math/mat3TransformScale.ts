import { mat2TransformScale } from "./mat2TransformScale"
import { Mat3 } from "./Mat3"

export const mat3TransformScale = (scaleX: number, scaleY?: number): Mat3 => {
  if (scaleY === undefined) {
    scaleY = scaleX
  }
  const mat2Scale = mat2TransformScale(scaleX, scaleY)
  return [mat2Scale[0], mat2Scale[1], 0, mat2Scale[2], mat2Scale[3], 0, 0, 0, 1]
}
