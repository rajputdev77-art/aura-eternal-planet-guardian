# BLOCKER — RESOLVED 2026-04-19

The challenge folder was empty at project start (2026-04-18) — no Backboard SDK docs were provided. Built initially against a `localStorage`-backed `BackboardClient`. **As of 2026-04-19, the real Backboard REST API is wired in.**

## What changed

`src/lib/backboard.js` now contains two backends behind one client surface:

- **`BackboardBackend`** — talks to `https://app.backboard.io/api` using the patterns from the official cookbook ([Backboard-io/backboard_io_cookbook](https://github.com/Backboard-io/backboard_io_cookbook)). Per-user isolation via one assistant per user (`aura-user-${userId}`), auto-created on first call. Memory CRUD via `POST/GET/DELETE /assistants/{aid}/memories`.
- **`LocalStorageBackend`** — the original stand-in. Same async surface.

The active backend is chosen at construction time:

- If `VITE_BACKBOARD_API_KEY` is set → real Backboard.
- If not set → localStorage (so the demo runs out of the box).
- If the real API throws on first call (CORS, auth, network) → automatic fallback to localStorage with a console warning. The demo never breaks.

## What the human still needs to do

To win the Backboard prize, the live deploy must talk to the real API:

1. Sign up at https://app.backboard.io/.
2. Generate an API key (Settings → API Keys).
3. Add `VITE_BACKBOARD_API_KEY=<key>` to `.env` for local dev.
4. Add `VITE_BACKBOARD_API_KEY` as a Vercel env var (Production + Preview + Development) before deploy.
5. After deploy, open DevTools → Application → Local Storage → look for `aura:assistantId`. Its presence confirms a real Backboard assistant was created on first use. The Backboard dashboard will also show the new `aura-user-${userId}` assistant.

## Known constraints

- **Browser-side API key.** A Vite `VITE_`-prefixed env var lands in the client bundle. Acceptable for a hackathon; in production the recommended pattern is to proxy Backboard calls through a serverless function.
- **CORS.** If Backboard's API rejects browser-origin requests, the client logs a warning and falls back to localStorage automatically. In that case, swap to a tiny serverless proxy (Vercel Edge function would be ~30 lines) or wait for Backboard to enable CORS for the deploy origin.
