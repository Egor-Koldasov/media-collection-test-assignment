import { Mat4 } from "./Mat4"

export const mat4TransformScale = (
  scaleX: number,
  scaleY?: number,
  scaleZ?: number,
): Mat4 => {
  if (scaleY === undefined) {
    scaleY = scaleX
  }
  if (scaleZ === undefined) {
    scaleZ = scaleX
  }
  return [scaleX, 0, 0, 0, 0, scaleY, 0, 0, 0, 0, scaleZ, 0, 0, 0, 0, 1]
}
