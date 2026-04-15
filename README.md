# Media Collection Manager

Minimal single-page media manager built with React, TypeScript, Redux Toolkit, Redux Saga, and Tailwind CSS.

## Run locally

Fresh clone:

```bash
npm install && npm run dev
```

Other useful commands:

```bash
npm run test:run
npm run build
```

## What’s in the app

- Infinite-scroll media gallery with paginated loading via `IntersectionObserver`
- Client-side filter, sort, and debounced search powered by memoized selectors
- Concurrent uploads with optimistic cards, progress, cancellation, and retry
- Client-side thumbnail generation for images and videos with `Canvas`
- IndexedDB-backed preview cache keyed by `fileName + fileSize`

## Mock API approach

The mock layer lives in [`src/services/mockMediaApi.ts`](/Users/egorkolds/.codex/worktrees/4e89/one-shot/src/services/mockMediaApi.ts) and exposes the exact contract from the task:

- `fetchMediaPage(page)`
- `uploadFile(file, onProgress, signal)`

I chose an in-memory mock module instead of MSW or `json-server` because there is no real backend contract, no route surface, and no persistence requirement for this take-home. A direct service module keeps the async behavior explicit, easy to test, and easy to swap later. Replacing it with a real API would mean keeping the saga layer and changing only the service implementation.

The mock intentionally includes:

- 60 deterministic seeded items
- 12-item pages
- 500-1000 ms latency
- About 15% fetch failures
- About 20% upload failures

## Preview cache choice

I chose IndexedDB instead of the Cache API for preview storage.

- The stored value is a generated preview `Blob`, not an HTTP response.
- The required cache key is `fileName + fileSize`, which maps cleanly to an IndexedDB object store.
- IndexedDB keeps the cache logic explicit and easier to evolve into richer metadata later.

Without IndexedDB, previews would be regenerated every time the same file was selected again, which adds unnecessary client work and makes retry flows feel worse.

## Library choices

- `react`: rendering the application UI.
- `typescript`: strict typing and discriminated unions for async state.
- `vite`: fast local development and production bundling.
- `@reduxjs/toolkit`: slices, normalized entity state, memoized selectors, and predictable reducer code.
- `react-redux`: typed bindings between React and the Redux store.
- `redux-saga`: orchestration for concurrent uploads, debounce, cancellation, and guarded pagination.
- `tailwindcss`: consistent, production-friendly styling without a UI kit.
- `vitest`: fast unit tests in the same Vite toolchain.
- `fake-indexeddb`: IndexedDB test environment for cache coverage.

Without Redux Toolkit and Saga, the app would need more manual state wiring and more fragile async coordination. Without Tailwind, the UI would still work, but maintaining the visual system would be slower. Without Vitest and fake-indexeddb, the async service and cache behavior would be harder to verify confidently.

## Architecture notes

- Redux state only contains serializable UI and domain data.
- `File`, `AbortController`, running saga tasks, and temporary object URLs stay in a module-scoped runtime registry.
- All filtering, sorting, search, pagination guards, and empty-state decisions go through selectors.
- Seeded image and video items use a local pool of 10 cat photos, chosen randomly when mock items are created, and documents use a static illustration because the provided contract has no media URLs.

## Trade-offs and shortcuts

- User-created uploads and removals are session-only. The preview cache persists, but the gallery contents reset on refresh.
- The mock API is service-based rather than HTTP-based. That keeps the implementation smaller, but it does not mimic network tooling like MSW would.
- The generated video thumbnail uses the first available frame from a hidden video element, which is appropriate for the task but not as robust as a dedicated media processing pipeline.

## What I would improve with more time

- Add a small integration test layer for the main upload and infinite-scroll flows.
- Persist user-created media entries locally for an optional “resume session” experience.
- Add richer cache invalidation metadata and a lightweight cache size budget.
- Introduce an MSW-backed mode to exercise the same app against a request boundary.

## Loom demo

Replace this placeholder with the final public Loom link before submission:

- `TODO: add Loom demo URL`
