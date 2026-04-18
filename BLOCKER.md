# BLOCKER — Backboard SDK Docs Missing

**Status:** Challenge folder was empty at project start (2026-04-18). No `backboard*` docs, no API references, no SDK examples were provided.

## What this means

Aura was built against a `BackboardClient` abstraction in `src/lib/backboard.js`. The abstraction is backed by `localStorage` today — namespaced by a generated `userId` — but every method is `async` and mirrors what a real SDK surface would look like (`saveMemory`, `getMemory`, `listMemories`, `clearMemories`).

## What needs to happen before submission

To be eligible for the **Best Use of Backboard** prize, the localStorage layer must be replaced with real Backboard SDK calls. The swap should be ~10 lines inside `src/lib/backboard.js`:

1. `npm install` the Backboard SDK (or set the fetch base URL if it's HTTP).
2. Replace the body of each method in `BackboardClient` (currently `localStorage.getItem` / `setItem` + JSON parse) with the SDK call.
3. Keep the method signatures and return shapes identical — `App.jsx` reads `{ memories: [...] }` and individual `{ key, value, createdAt }` entries.
4. Populate `VITE_BACKBOARD_API_KEY` in `.env`.

## Why we shipped with the mock

The submission deadline is Monday 2026-04-20 12:29 PM IST. Rather than block the UI/UX/AI work on missing docs, the app was built end-to-end against the abstraction so the substitution is mechanical. All persistence behavior — cross-session memory, streaks, habit accumulation, impact scoring — works today via localStorage and will continue to work once Backboard is wired in.

**If the real SDK is not swapped in before submission, the Backboard prize is unwinnable.** The overall-winner track remains open because the memory-driven UX is the concept, regardless of backing store.
