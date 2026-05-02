import { Mat4 } from "./Mat4"
import { mat4Id } from "./mat4Id"

const mat4MultTwo = (a: Mat4, b: Mat4): Mat4 => {
  // Returns a * b
  // Matrix is stored in WebGL / GLSL column-major order:
  //
  // [
  //   m00, m10, m20, m30,
  //   m01, m11, m21, m31,
  //   m02, m12, m22, m32,
  //   m03, m13, m23, m33,
  // ]

  return [
    // column 0
    a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
    a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
    a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
    a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],

    // column 1
    a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
    a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
    a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
    a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],

    // column 2
    a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
    a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
    a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
    a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],

    // column 3
    a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
    a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
    a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
    a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15],
  ]
}

export const mat4Mult = (...mat4List: Mat4[]): Mat4 => {
  if (mat4List.length === 0) {
    return mat4Id()
  }

  let result = mat4List[0]

  for (let i = 1; i < mat4List.length; i++) {
    result = mat4MultTwo(result, mat4List[i])
  }

  return result
}
