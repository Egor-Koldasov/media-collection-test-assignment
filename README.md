# WebGL and Three.js Demo Library

A sparse Next.js starter for learning raw WebGL2 and advanced Three.js through
small, focused demos.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

Open `http://localhost:3000` to browse the demo library.

## Project Shape

- `src/app` contains the Next.js App Router pages and global styles.
- `src/demo/{demoName}` contains demo-specific metadata and client components.
- The home page lists all registered demos from `src/demo/index.ts`.

## Included Demos

- `raw-webgl-triangle`: one WebGL2 triangle using hand-written shaders, a vertex
  buffer, an attribute, and `drawArrays`.
- `three-spinning-cube`: one rotating Three.js cube using a scene, camera,
  renderer, mesh, material, lights, and resize handling.

## Learning Roadmap

1. Triangle to Transform Pipeline playground
2. Raw WebGL image filter editor
3. Mini 2D renderer
4. Raw WebGL 3D cube scene
5. Three.js scene laboratory
6. Product configurator
7. Interactive solar system
8. Instanced forest / city / asteroid field
9. Shader material gallery
10. Post-processing playground
11. glTF character viewer
12. Mini level editor
13. Procedural terrain explorer
14. GPU particle system

Useful references:

- [WebGL2 Fundamentals](https://webgl2fundamentals.org/)
- [Three.js Manual](https://threejs.org/manual/)
- [Three.js Docs](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
