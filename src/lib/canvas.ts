export function getPixelRatio(max = 2) {
  return Math.min(window.devicePixelRatio || 1, max);
}

export function getCanvasDisplaySize(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();

  return {
    width: Math.max(1, Math.floor(rect.width)),
    height: Math.max(1, Math.floor(rect.height))
  };
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const pixelRatio = getPixelRatio();
  const { width, height } = getCanvasDisplaySize(canvas);
  const drawingWidth = Math.max(1, Math.floor(width * pixelRatio));
  const drawingHeight = Math.max(1, Math.floor(height * pixelRatio));

  if (canvas.width !== drawingWidth || canvas.height !== drawingHeight) {
    canvas.width = drawingWidth;
    canvas.height = drawingHeight;
  }

  return { width: drawingWidth, height: drawingHeight };
}
