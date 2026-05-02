"use client"

import { useEffect, useRef, useState } from "react"

type CanvasSetup<Opts> = (
  canvas: HTMLCanvasElement,
  opts: Opts,
) => void | (() => void)

export function useCanvasDemo<Opts>(
  setup: CanvasSetup<Opts>,
  label: string,
  opts: Opts,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    try {
      return setup(canvas, opts)
    } catch (caughtError) {
      console.error("Error during canvas setup:", caughtError)
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unknown demo error.",
      )
    }
  }, [setup])

  return {
    ariaLabel: error ?? label,
    error,
    canvasRef,
  }
}
