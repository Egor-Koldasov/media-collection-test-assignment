# Media Collection Manager

## Run locally

```bash
npm install && npm run dev
```

## Mock API approach

The mock API lives in `src/services/mockMediaApi.ts` and exposes the required contract:

- `fetchMediaPage(page)`
- `uploadFile(file, onProgress, signal)`

I implemented it as an in-memory service module instead of MSW or `json-server` because this task has no real backend contract, no routing surface, and no persistence requirement. This keeps the async behavior explicit, easy to test, and easy to replace later by swapping the service implementation without changing the Redux or saga layers.

The mock provides:

- 60 seeded items
- 12-item pages
- 500-1000 ms latency
- about 15% fetch failures
- about 20% upload failures

## Preview cache choice

I chose IndexedDB for preview caching instead of the Cache API because the stored value is a generated image `Blob`, not an HTTP response. The cache key is `fileName + fileSize`, which maps directly to an IndexedDB entry and lets the app skip canvas generation when the same file is selected again.

## Library choices

- `react`: renders the single-page UI.
- `react-dom`: mounts the React app in the browser.
- `typescript`: provides strict typing and discriminated unions for async state.
- `@reduxjs/toolkit`: handles slices, normalized entity state, and immutable reducer logic with less boilerplate.
- `react-redux`: provides typed bindings between React components and the Redux store.
- `redux-saga`: coordinates concurrent uploads, debounce, cancellation, and pagination guards.
- `vite`: provides local development and production bundling with a small setup.
- `@vitejs/plugin-react`: enables React support in the Vite toolchain.
- `tailwindcss`: provides styling without introducing a UI kit.
- `postcss`: runs the CSS processing pipeline required by Tailwind.
- `autoprefixer`: adds vendor prefixes during CSS build output.
- `vitest`: runs unit tests in the same toolchain as the app build.
- `jsdom`: provides the browser-like environment used by tests.
- `@testing-library/jest-dom`: adds clearer DOM assertions for tests.
- `fake-indexeddb`: provides IndexedDB support in tests so the preview cache can be verified.
- `@types/node`, `@types/react`, `@types/react-dom`: provide TypeScript types for the runtime and tooling.

Without these choices, the same app would require more manual state wiring, less reliable async coordination, weaker test coverage for browser APIs, or a slower local development loop.

## Trade-offs and shortcuts

- Uploaded items and removals are session-only; they are not persisted across refreshes.
- The mock API is a service module rather than an HTTP mock layer; that keeps the project smaller, but it does not exercise request tooling.
- Video thumbnails are generated from the first available frame in the browser, which is sufficient here but simpler than a production media pipeline.

## What I would improve with more time

- Add integration tests for the main upload and infinite-scroll flows.
- Persist uploaded media metadata locally so the collection survives refreshes.
- Add cache invalidation metadata and a cache size budget.
- Add an MSW-backed mode to test the same UI through a request boundary.

## Loom demo

- Public Loom URL: `REPLACE_WITH_PUBLIC_LOOM_LINK`
