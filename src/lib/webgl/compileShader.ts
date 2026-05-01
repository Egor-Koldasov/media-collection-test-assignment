export function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
) {
  const shader = gl.createShader(type)

  if (!shader) {
    throw new Error("Unable to create shader.")
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error."
    gl.deleteShader(shader)
    throw new Error(log)
  }

  const info = gl.getShaderInfoLog(shader)

  if (info) {
    console.warn("Shader compiler message:", info)
  }

  return shader
}
