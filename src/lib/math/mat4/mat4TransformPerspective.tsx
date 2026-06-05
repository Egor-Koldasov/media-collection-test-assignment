import { Mat4 } from "./Mat4"

export const mat4TransformPerspective = (
  fovDegrees: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 => {
  const fieldOfViewInRadians = (fovDegrees * Math.PI) / 180
  const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians)
  const rangeInv = 1.0 / (near - far)

  // prettier-ignore
  return [
    f / aspect, 0, 0,                         0,
    0,          f, 0,                         0,
    0,          0, (near + far) * rangeInv,  -1,
    0,          0, near * far * rangeInv * 2, 0,
  ];
}
