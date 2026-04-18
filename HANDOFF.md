# HANDOFF — Pre-Submission Checklist

Ten lines. Do them in order. Submit only after the last box is ticked.

- [ ] **1. Paste `VITE_GEMINI_API_KEY` into `.env`** from [Google AI Studio](https://aistudio.google.com/app/apikey), then run `npm run dev` once and send Aura a real message end-to-end.
- [ ] **2. Swap the mock `BackboardClient`** in [`src/lib/backboard.js`](src/lib/backboard.js) for the real Backboard SDK — four method bodies, same async signatures. See [BLOCKER.md](BLOCKER.md). *This is what makes the Backboard prize winnable.*
- [ ] **3. Delete your dev `.env`** before `git add`. Confirm `.gitignore` already excludes it.
- [ ] **4. `npm run build` must succeed** with no errors. A chunk-size warning is fine; a type/import error is not.
- [ ] **5. Deploy to Vercel.** Import the repo, preset = Vite, add `VITE_GEMINI_API_KEY` as an env var in Vercel settings, deploy. See [README.md](README.md#deploy-to-vercel).
- [ ] **6. Record the 60-second demo** following [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — three turns, memory-recall payoff on turn 3. Export as an MP4 or GIF. Host it somewhere public (YouTube unlisted, Loom, or a `/demo` asset in your repo).
- [ ] **7. Paste the live Vercel URL and the demo video URL** into the two placeholders inside [SUBMISSION.md](SUBMISSION.md) under *Demo* and *Links*.
- [ ] **8. Sanity-read [SUBMISSION.md](SUBMISSION.md)** top to bottom. Fix anything that sounds like it was written by an AI rather than by you. The voice should be confident and specific.
- [ ] **9. Publish SUBMISSION.md as a DEV.to post.** Tag it `earthday`, `ai`, `react`, `webdev`. Front-matter: canonical link back to this repo. Target prize: *Best use of Backboard*.
- [ ] **10. Submit on the challenge page before Monday 2026-04-20 12:29 PM IST.** One entry, one prize — do not split your attention across categories.

---

Good luck. The planet is counting on the memory layer.
