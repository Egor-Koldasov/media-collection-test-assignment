# Media Collection Manager - the test assignment

## Run locally

```bash
npm install
npm run dev
```

## Mock API approach

Mock API is implemented using MSW. MSW is a popular and reliable solution for creating mock API servers. For this task we do not have the exact backend contract, but in a real system we would. MSW is a better fit for that assumption than an in-memory service module because the client already talks to `/api/...` endpoints, so replacing the mock later means swapping the handlers for a real server instead of rewriting the application flow.

## Preview cache choice

Preview cache is implemented using IndexedDB. IndexedDB works well when we treat images generated in browser as `Blob` data, while Cache API is designed for request-response pairs. In practice both choices solve this task well.

## Library choices

- `redux-saga`: Works well with redux and redux-toolkit. It's also used in the actual app, therefore it's nice to pick it in the test assignment.
- `vite`: Modern, easy-to-use solution for a React SPA.
- `tailwindcss`: Modern styling approach, that is popular and works good with LLMs.
- `vitest`: Good modern solution to run tests.
- `jsdom`: Provides the browser-like environment used by tests.
- `@testing-library/jest-dom`: DOM helpers for tests.
- `fake-indexeddb`: Mock IndexedDB for tests.

## Trade-offs and shortcuts

The project did not involve significant decisions. Major choices were dictated by the requirements. Library choices are explained in the section above. The shortcuts are listed in the section below.

## What I would improve with more time

- [ ]  Fix infinite scroll jumps. After loading more items the page stays at the bottom of the list which creates a jumping effect.
- [ ]  Inherit action creator types in sagas. Sagas don't throw errors if action payload types are incorrect. Inheriting types from action creators can help reacting to changes in payload types.
- [ ]  Big amount of CSS literals in tailwind. In real project this can be fixed with a better UI library, design code and conventions.
- [ ]  Use map objects instead of if else chains.
- [ ]  For react conditional rendering use `&&` instead of `cond ? <Comp /> : null`.
- [ ]  Add virtual scrolling. Consider optimizing the code for big lists.
- [ ]  Setup prettier, eslint.
- [ ]  Add responsive styles for smaller screens.

## Loom demo

[https://www.loom.com/share/ba16175aa7e249b89fb5ef197938175a](https://www.loom.com/share/ba16175aa7e249b89fb5ef197938175a)

## Task requirements
[test-assignment.pdf](./test-assignment.pdf)
