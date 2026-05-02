import { Mat4 } from "./Mat4"
import { mat4Id } from "./mat4Id"

export const mat4Mult = (...mat4List: Mat4[]): Mat4 => {
  if (mat4List.length === 0) {
    return mat4Id()
  }

  let result: Mat4 = mat4List[0]

  for (let i = 1; i < mat4List.length; i++) {
    const m = mat4List[i]
    const a00 =
      result[0] * m[0] + result[1] * m[4] + result[2] * m[8] + result[3] * m[12]
    const a01 =
      result[0] * m[1] + result[1] * m[5] + result[2] * m[9] + result[3] * m[13]
    const a02 =
      result[0] * m[2] +
      result[1] * m[6] +
      result[2] * m[10] +
      result[3] * m[14]
    const a03 =
      result[0] * m[3] +
      result[1] * m[7] +
      result[2] * m[11] +
      result[3] * m[15]
    const a10 =
      result[4] * m[0] + result[5] * m[4] + result[6] * m[8] + result[7] * m[12]
    const a11 =
      result[4] * m[1] + result[5] * m[5] + result[6] * m[9] + result[7] * m[13]
    const a12 =
      result[4] * m[2] +
      result[5] * m[6] +
      result[6] * m[10] +
      result[7] * m[14]
    const a13 =
      result[4] * m[3] +
      result[5] * m[7] +
      result[6] * m[11] +
      result[7] * m[15]
    const a20 =
      result[8] * m[0] +
      result[9] * m[4] +
      result[10] * m[8] +
      result[11] * m[12]
    const a21 =
      result[8] * m[1] +
      result[9] * m[5] +
      result[10] * m[9] +
      result[11] * m[13]
    const a22 =
      result[8] * m[2] +
      result[9] * m[6] +
      result[10] * m[10] +
      result[11] * m[14]
    const a23 =
      result[8] * m[3] +
      result[9] * m[7] +
      result[10] * m[11] +
      result[11] * m[15]
    const a30 =
      result[12] * m[0] +
      result[13] * m[4] +
      result[14] * m[8] +
      result[15] * m[12]
    const a31 =
      result[12] * m[1] +
      result[13] * m[5] +
      result[14] * m[9] +
      result[15] * m[13]
    const a32 =
      result[12] * m[2] +
      result[13] * m[6] +
      result[14] * m[10] +
      result[15] * m[14]
    const a33 =
      result[12] * m[3] +
      result[13] * m[7] +
      result[14] * m[11] +
      result[15] * m[15]
    result = [
      a00,
      a01,
      a02,
      a03,
      a10,
      a11,
      a12,
      a13,
      a20,
      a21,
      a22,
      a23,
      a30,
      a31,
      a32,
      a33,
    ]
  }

  return result
}
