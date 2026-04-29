"use client";

import { useCallback } from "react";
import * as THREE from "three";
import { getCanvasDisplaySize, getPixelRatio } from "@/lib/canvas";
import { useCanvasDemo } from "@/lib/use-canvas-demo";

function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement
) {
  const { width, height } = getCanvasDisplaySize(canvas);

  renderer.setPixelRatio(getPixelRatio());
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function ThreeSpinningCubeDemo() {
  const setup = useCallback((canvas: HTMLCanvasElement) => {
    let renderer: THREE.WebGLRenderer | undefined;
    let animationFrame = 0;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
      });
      renderer.setClearColor(0x090909, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.set(0, 0, 4);

      const geometry = new THREE.BoxGeometry(1.35, 1.35, 1.35);
      const material = new THREE.MeshStandardMaterial({
        color: 0x9fddc7,
        roughness: 0.42,
        metalness: 0.12
      });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
      keyLight.position.set(2, 3, 4);
      scene.add(keyLight);
      scene.add(new THREE.AmbientLight(0xffffff, 0.35));

      const render = () => {
        if (!renderer) {
          return;
        }

        resizeRenderer(renderer, camera, canvas);
        cube.rotation.x += 0.008;
        cube.rotation.y += 0.012;
        renderer.render(scene, camera);

        animationFrame = window.requestAnimationFrame(render);
      };

      render();

      return () => {
        window.cancelAnimationFrame(animationFrame);
        geometry.dispose();
        material.dispose();
        renderer?.dispose();
      };
    } catch (caughtError) {
      renderer?.dispose();
      throw caughtError;
    }
  }, []);
  const { ariaLabel, canvasRef } = useCanvasDemo(
    setup,
    "Three.js spinning cube demo"
  );

  return (
    <canvas
      aria-label={ariaLabel}
      className="demo-canvas"
      ref={canvasRef}
    />
  );
}
