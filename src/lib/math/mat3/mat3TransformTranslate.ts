import { Mat3 } from "./Mat3"

export const mat3TransformTranslate = (
  scaleX: number,
  scaleY: number,
): Mat3 => {
  return [1, 0, 0, 0, 1, 0, scaleX, scaleY, 1]
}
