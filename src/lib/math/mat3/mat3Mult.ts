import { Mat3 } from "./Mat3"

export const mat3Mult = (...mat3List: Mat3[]): Mat3 => {
  if (mat3List.length === 0) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1]
  }

  let result: Mat3 = mat3List[0]

  for (let i = 1; i < mat3List.length; i++) {
    const m = mat3List[i]
    const a00 = result[0] * m[0] + result[1] * m[3] + result[2] * m[6]
    const a01 = result[0] * m[1] + result[1] * m[4] + result[2] * m[7]
    const a02 = result[0] * m[2] + result[1] * m[5] + result[2] * m[8]
    const a10 = result[3] * m[0] + result[4] * m[3] + result[5] * m[6]
    const a11 = result[3] * m[1] + result[4] * m[4] + result[5] * m[7]
    const a12 = result[3] * m[2] + result[4] * m[5] + result[5] * m[8]
    const a20 = result[6] * m[0] + result[7] * m[3] + result[8] * m[6]
    const a21 = result[6] * m[1] + result[7] * m[4] + result[8] * m[7]
    const a22 = result[6] * m[2] + result[7] * m[5] + result[8] * m[8]
    result = [a00, a01, a02, a10, a11, a12, a20, a21, a22]
  }

  return result
}
