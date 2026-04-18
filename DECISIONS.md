# DECISIONS

Log of non-obvious choices made while building Aura. One-liners.

## Backboard

- **Folder was empty on 2026-04-18** — no SDK docs present. See [BLOCKER.md](BLOCKER.md). Shipped with a `localStorage`-backed `BackboardClient` that mirrors the async surface a real SDK would expose. Swap = ~10 lines.
- **All client methods are `async`** even though localStorage is sync — keeps the call sites identical once the real SDK lands (no refactor of `App.jsx`).
- **`userId` is generated once** (`crypto.randomUUID()`) on first run and stored in localStorage under `aura:userId`. All memory keys are namespaced `aura:${userId}:memory:${key}`.
- **Memory key prefixes encode kind + timestamp** (`habit:${ts}:${i}`, `goal:…`, `assessment:…`, `delta:…`). That gives a queryable stream without a schema migration when Aura learns a new kind of thing.

## Gemini

- Model is `gemini-2.5-flash`, exported as the top-level constant `GEMINI_MODEL` from [`src/lib/gemini.js`](src/lib/gemini.js). No dated preview strings.
- One retry on 429/5xx with 600 ms → 1800 ms exponential backoff. Beyond that we surface the error in chat.
- API key read from `import.meta.env.VITE_GEMINI_API_KEY`. If missing, the app still renders — the first user message returns a clear inline error explaining how to add the key.

## AI protocol

- **System prompt is a top-level constant** (`AURA_SYSTEM_PROMPT` in [`src/App.jsx`](src/App.jsx)), copied verbatim from the challenge spec with `{MEMORY_JSON_HERE}` replaced at request time via `.replace()`.
- **Structured updates via `<aura-update>{...}</aura-update>`** appended after the prose response. Parser strips the block for display and feeds the JSON into Backboard. Schema: `{ newHabits: string[], updatedGoals: string[], impactDelta: number, assessment: string | null }`.
- Temperature 0.7, max 1024 output tokens. Safety settings at `BLOCK_ONLY_HIGH` — coaching about regressions shouldn't trip harassment filters.

## Impact score

- Weighted: transport 3×, diet 2×, energy 2×, reusables 1×. Keeps the most impactful behaviors visible.
- Scaled to 0–1000 with diminishing returns (`log1p`) so a power-user doesn't max out by day two and lose motivation. Reference ceiling = 20 habits/category "mastered".
- Pure function, no DOM, no Backboard calls — easy to unit-test later.
- Keyword classifier + optional explicit `category` field. If Gemini ever starts tagging its habits with categories directly, the explicit field wins.

## Design system

- **Nature-Core palette** with named tokens: `forest`, `canopy`, `bone`, `stone`, `ink`, `lichen`, `amber-bark`, `alert`. Scale palettes (`moss.50…950`, `bark.…`) repointed to the same hex codes for shade-based classes.
- **Fonts:** Inter for UI (all body / buttons / chips), Fraunces for the Aura wordmark and dashboard headings only — loaded from Google Fonts with `preconnect` to avoid FOUT stalls.
- **Radii:** 16 px cards (`rounded-card`), 12 px buttons (`rounded-btn`), full pills.
- **Motion:** messages fade-in-up 200 ms. Score count-up 600 ms ease-out via `requestAnimationFrame` — no external dep. `prefers-reduced-motion` kills animations and the button press-scale.
- **Dark mode is the default.** Earth Day judges will likely demo at night or in a conference hall. Toggle persists in `aura:theme`.

## UI

- Three columns ≥768 px, tabbed below. Tabs: Legacy / Chat / Score. Chat is the default mobile tab.
- Recharts radial bar for the 4 category breakdown. Lucide leaf/sparkle icons. No emoji anywhere.
- `role="log"` + `aria-live="polite"` on the chat scroll area so screen readers announce new Aura messages.
- Skip-to-chat link at the top for keyboard users.
- Textarea has a visible associated `<label>` (sr-only) and explicit `aria-label`.

## State management

- `useState` + `useReducer` only. No Zustand, no Redux, no context. The message list uses a reducer (`SET` / `APPEND` / `REPLACE_LAST`) because that surface was already showing up and the reducer makes the transitions explicit.
- Memory state is the single source of truth. Score, streak, assessment, and the dashboard all derive from `memories` via `useMemo`.

## Tooling

- Vite + React 18, Tailwind 3 (stable), Recharts, Lucide, Google Fonts via stylesheet. No routing — single page.
- No TypeScript. Not worth the config cost at this time budget and there are no large API surfaces to type.
- No tests. Deadline-driven. `impactEngine.js` is the pure function worth testing first if/when tests get added.
- `.env.example` documents the two env vars. `.env` is gitignored.

## What I did NOT build

- Streaming responses. Spec says no streaming — thinking indicator only.
- Auth. Single-user local app; `userId` is opaque.
- Export / import of memories. The mock's localStorage is already portable; real Backboard will handle this at the service layer.
- GitHub Copilot integration. Session-wide autonomous build — no IDE completion surface in the loop. Noted honestly in [SUBMISSION.md](SUBMISSION.md).
