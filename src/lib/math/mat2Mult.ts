import { Mat2 } from "./Mat2"

export const mat2Mult = (...mat2List: Mat2[]): Mat2 => {
  if (mat2List.length === 0) {
    return [1, 0, 0, 1]
  }

  let result: Mat2 = mat2List[0]

  for (let i = 1; i < mat2List.length; i++) {
    const m = mat2List[i]
    const a00 = result[0] * m[0] + result[1] * m[2]
    const a01 = result[0] * m[1] + result[1] * m[3]
    const a10 = result[2] * m[0] + result[3] * m[2]
    const a11 = result[2] * m[1] + result[3] * m[3]
    result = [a00, a01, a10, a11]
  }

  return result
}
