import { Mat4 } from "./Mat4"

export const mat4TransformTranslate = (
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): Mat4 => {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, scaleX, scaleY, scaleZ, 1]
}
