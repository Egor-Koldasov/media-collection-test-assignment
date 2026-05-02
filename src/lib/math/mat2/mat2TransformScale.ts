import { Mat2 } from "./Mat2"

export const mat2TransformScale = (scaleX: number, scaleY: number): Mat2 => {
  return [scaleX, 0, 0, scaleY]
}
