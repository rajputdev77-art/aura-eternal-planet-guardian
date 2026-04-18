# Aura — Eternal Planet Guardian

A stateful AI environmental coach. Aura remembers your habits, your streaks, and your honest moments — and coaches you across time.

Built for the DEV Weekend Challenge (Earth Day 2026). Target: Best use of **Backboard**. Supporting tech: **Google Gemini** (`gemini-2.5-flash`).

- **Submission write-up:** [SUBMISSION.md](SUBMISSION.md)
- **Design & engineering decisions:** [DECISIONS.md](DECISIONS.md)
- **60-second demo script:** [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- **Pre-submission checklist:** [HANDOFF.md](HANDOFF.md)
- **Known gaps:** [BLOCKER.md](BLOCKER.md)

---

## Run it locally

```bash
git clone <this-repo>
cd aura
npm install
cp .env.example .env
# open .env and paste your Gemini API key into VITE_GEMINI_API_KEY
npm run dev
```

Open http://localhost:5173.

### Get a Gemini API key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a key (free tier is more than enough for local use).
3. Paste it after `VITE_GEMINI_API_KEY=` in your `.env` file.
4. Restart the dev server so Vite picks up the new env var.

If the key is missing, the app still loads — the first message surfaces an inline error explaining exactly what to do.

---

## Environment variables

All variables are prefixed with `VITE_` so they are exposed to the client bundle. There is no backend.

| Variable | Required? | Purpose |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Yes | Google AI Studio key for `gemini-2.5-flash`. |
| `VITE_BACKBOARD_API_KEY` | Reserved | For when the Backboard SDK is wired in — see [BLOCKER.md](BLOCKER.md). Ignored today. |

See [`.env.example`](.env.example) for the up-to-date list.

---

## Build

```bash
npm run build     # production build into dist/
npm run preview   # serve the built dist/ locally to sanity-check
```

A successful build prints a `✓ built in …s` line and outputs `dist/index.html`, `dist/assets/index-*.js`, and `dist/assets/index-*.css`.

---

## Deploy to Vercel

The app is pure client-side — any static host works, but Vercel's React/Vite preset is the fastest path.

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel                  # first deploy; accept the detected Vite preset
vercel --prod           # promote to production
```

### Option B — Vercel dashboard

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset: **Vite** (auto-detected).
4. Build command: `npm run build`. Output directory: `dist`.
5. Add an environment variable: `VITE_GEMINI_API_KEY` = *(your key)*. Target: **Production, Preview, Development**.
6. Deploy.

> Treat the Gemini key as secret. Even though `VITE_`-prefixed vars end up in the client bundle, do not publish your key to a public repo — use Vercel's env-var storage.

Once deployed, paste the live URL into the Demo section of [SUBMISSION.md](SUBMISSION.md) and the HANDOFF checklist.

---

## Project layout

```
src/
  App.jsx               # three-column UI, chat loop, Gemini + Backboard glue
  main.jsx              # React root, theme bootstrap
  index.css             # Tailwind layers + component classes
  lib/
    gemini.js           # askGemini() with retry, GEMINI_MODEL constant
    backboard.js        # BackboardClient (async surface; localStorage today)
    impactEngine.js     # computeImpactScore — pure, weighted, log-scaled
public/
  aura.svg              # favicon
index.html              # Google Fonts (Inter + Fraunces), dark-mode boot
tailwind.config.js      # Nature-Core palette, radii, motion tokens
```

---

## What NOT to put here

- No backend. No API routes. No server-side rendering. Client-only is a feature, not a gap.
- No auth. `userId` is a local opaque identifier. When the real Backboard SDK lands, auth moves into that layer.
- No tests yet. See [DECISIONS.md](DECISIONS.md) for the trade-off; `impactEngine.js` is the priority if/when tests get added.

---

## License

MIT or equivalent — your call, this is a hackathon submission.
