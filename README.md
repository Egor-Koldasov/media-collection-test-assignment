# Last Lantern

A graphics-first Three.js survival demo about a procedurally generated company of autonomous constructs.

## Run locally

```bash
npm run dev
```

Then open the local URL printed by Vite. Use `1×`, `4×`, or `12×` to control simulation speed; the accelerated mode makes it practical to test the twenty-minute structure.

## Core loop

- Constructs regenerate AP and invoke their abilities in a strict, visible sequence.
- Enemies arrive continuously and scale across seven threat levels.
- Blessings let the player select both an upgrade and its recipient.
- Every blessing opens the ability-order editor before combat resumes.
- Procedural reinforcements add new bodies, stats, titles, colors, and ability combinations.
- The company wins by surviving twenty minutes and loses when its last construct falls.

The source is in `src/main.js` and `src/styles.css`. `npm run build` creates a production build in `build/` without overwriting the pre-existing `dist/` artifact.
