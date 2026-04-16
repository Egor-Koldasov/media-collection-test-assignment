# Media Collection Manager

## Run locally

```bash
npm install && npm run dev
```

## Mock API approach

The request client lives in `src/services/mediaApi.ts`. The mock backend lives in `src/mocks/handlers.ts` and is served through MSW.

- `fetchMediaPage(page)`
- `uploadFile(file, onProgress, signal)`

I chose MSW because it gives the app a real HTTP boundary without requiring a real backend. For this task we do not have the exact backend contract, but in a real system we would. MSW is a better fit for that assumption than an in-memory service module because the client already talks to `/api/...` endpoints, so replacing the mock later means swapping the handlers for a real server instead of rewriting the application flow.

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
- `msw`: provides the mock backend at the HTTP layer so the app can be wired like a real client.
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
- The upload progress is client-driven while the request is in flight because the task requires progressive updates but there is no real backend transport contract to stream that information from.
- Video thumbnails are generated from the first available frame in the browser, which is sufficient here but simpler than a production media pipeline.

## What I would improve with more time

- Add an integration test for the full UI flow against the MSW request boundary.
- Persist uploaded media metadata locally so the collection survives refreshes.
- Add cache invalidation metadata and a cache size budget.
- Add a real backend adapter once the production API contract is available.

## Loom demo

- Public Loom URL: `REPLACE_WITH_PUBLIC_LOOM_LINK`
