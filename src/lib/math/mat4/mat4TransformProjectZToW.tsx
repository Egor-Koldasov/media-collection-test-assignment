import { Mat4 } from "./Mat4"

// prettier-ignore
export const mat4TransformProjectZToW = (fudge: number = 1): Mat4 => ([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, fudge,
  0, 0, 0, 1,
])
