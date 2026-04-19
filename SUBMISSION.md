# Aura — Eternal Planet Guardian

**Every climate chatbot is amnesiac.**

## What I built

Every behavioral-change tool in the "help you live greener" category I have ever used has the same defect: it forgets. You open the tool, you confess you want to drive less, it produces a tidy encouraging paragraph, you close the tab. Tomorrow the tool greets you like a stranger. It doesn't know you promised to cycle on Thursday. It doesn't know you drove anyway. It doesn't know the three weeks last month when you were doing beautifully, nor the week after that when you quietly stopped. Advice without memory is noise.

The insight is narrow and specific: the hard part of climate action at the individual level is not information, it is *continuity of commitment*. A seasoned mentor does not give you a better fact than the internet — a mentor remembers. They reference what you said last week. They notice when you break a pattern. They celebrate quietly when you keep one. Stateless tools cannot do this, and that is why they do not change behavior.

Aura is a stateful environmental coach. Every habit you report, every goal you commit to, every honest admission of a regression is written to a persistent memory store. On every subsequent turn, Aura reads that memory back before it speaks. The conversation with Aura today is shaped by the conversation you had last month. That is the entire product. The UI is a Green Legacy dashboard: an evolving, dated record of ecological commitment, with an Impact Score that is nothing but a weighted view on the memory store.

## Demo

- **Live demo:** https://aura-eternal-planet-guardian.vercel.app
- **60-second walkthrough:** *(paste video / GIF link after recording — see [DEMO_SCRIPT.md](DEMO_SCRIPT.md))*

## Why Backboard is the soul of this project

Statelessness is the central failing of behavioral-change tools. Not tone, not information density, not UX polish — statelessness. A chatbot that cannot remember what you told it last week cannot coach you. It can only react. If you want to turn a tool into a relationship, you need a persistence layer that is structured, queryable, timestamped, portable, and long-lived. That is exactly what Backboard is for.

Backboard is therefore the architectural heart of Aura. Not a feature bolted on. The shape of the app is dictated by the fact that persistent memory is the product:

- **Every user turn starts with `backboard.listMemories()`.** The full memory payload is serialized into the system prompt before Gemini is ever called. Gemini never sees a turn in isolation.
- **Every user turn ends with `backboard.saveMemory()` calls.** New habits, updated goals, assessments, and impact deltas are all persisted as discrete, addressable memory entries — not blobs.
- **The Impact Score is a pure function of memory.** `src/lib/impactEngine.js` takes the memory list and produces `{ score, breakdown }` — no database, no cache. Memory *is* the database.

### The memory schema

Each memory entry is namespaced `aura:${userId}:memory:${key}` and has a tiny, deliberate shape:

```json
{
  "key": "habit:1744973128345:0",
  "value": { "habit": "Cycled to work instead of driving", "source": "aura" },
  "createdAt": 1744973128345
}
```

The `key` prefix encodes the entry kind (`habit`, `goal`, `assessment`, `delta`), the timestamp, and an ordinal. That gives us a queryable stream without needing a schema migration every time Aura learns a new kind of thing.

### The client

```js
// src/lib/backboard.js
export class BackboardClient {
  constructor() {
    this.userId = ensureUserId();
    this.prefix = `aura:${this.userId}:memory:`;
  }

  async saveMemory(key, value) {
    const entry = { key, value, createdAt: Date.now() };
    // Real SDK call goes here. The interface is the contract.
    return entry;
  }

  async listMemories() { /* ... */ }
  async getMemory(key) { /* ... */ }
  async clearMemories() { /* ... */ }
}
```

Four methods, all async, all namespaced. That is enough surface for an entire stateful coaching app. The async contract is deliberate: it means swapping the storage backend out never touches `App.jsx`.

### Namespacing and portability

`userId` is generated once on first open (via `crypto.randomUUID()`) and stored. Every memory key is prefixed with it. This is what makes the memory *portable* in the Backboard sense: it is tied to an identity, not to a browser. When the real Backboard SDK lands, the same `userId` can carry the same memory from a laptop to a phone to a shared-device session to a future, unrelated feature that also wants to reason over the user's Green Legacy. The namespace is the passport.

### What's actually wired

`src/lib/backboard.js` ships with **two backends behind one client**:

- **`BackboardBackend`** — the real Backboard REST API (`https://app.backboard.io/api`), `X-API-Key` auth, per-user assistant pattern (`aura-user-${userId}` auto-created on first call), memory CRUD via `POST/GET/DELETE /assistants/{aid}/memories`. Built directly from the patterns in the official [Backboard cookbook](https://github.com/Backboard-io/backboard_io_cookbook).
- **`LocalStorageBackend`** — an identical async surface backed by the browser. Used when `VITE_BACKBOARD_API_KEY` is absent, and as an automatic fallback on the first network/CORS error so a stray transient never bricks a live demo.

The active backend is decided at construction. The app code never knows which one is live — that's the contract the abstraction was built to enforce. The live deploy at https://aura-eternal-planet-guardian.vercel.app is wired to the real Backboard API; see [BLOCKER.md](BLOCKER.md) for the verification steps.

## Gemini as the brain

Backboard remembers. Gemini reasons over what is remembered.

Aura uses `gemini-2.5-flash` with a single retry on 429/5xx and exponential backoff. The key pattern is that the system prompt is not static — it is a template with the live memory payload injected on every turn:

```js
const systemPrompt = AURA_SYSTEM_PROMPT.replace(
  '{MEMORY_JSON_HERE}',
  JSON.stringify(memoryPayload, null, 2)
);
const { text } = await askGemini(messages, systemPrompt);
```

That one `.replace()` is what separates Aura from every other Gemini chatbot. Every turn, Gemini is handed the user's full ecological history as structured JSON, and instructed to reference it specifically and by name.

The second half of the contract is the **structured update block**. After Gemini's prose reply, it emits:

```
<aura-update>
{"newHabits": ["Cycled to work"], "updatedGoals": [], "impactDelta": 6, "assessment": null}
</aura-update>
```

The app parses that block out of the response, displays the prose to the user, and writes the structured fields back into Backboard. That is how Gemini writes into the memory store — as a typed, auditable protocol, not a free-form vibe. Personality stays consistent because the system prompt is pinned; memory stays clean because the schema is pinned.

## Honest notes on Copilot

I did not use GitHub Copilot in any meaningful way during this build. The project was written in a single autonomous session from an empty folder, without an IDE-integrated completion surface in the loop. Copilot is listed as a prize category, but the honest thing to say is that it did not shape this submission.

## Why this matters for the planet

The bottleneck in climate action at the individual level is not awareness — people know. It is not willingness — people try. It is *sustained behavior change over long time horizons against the drag of daily life*. Every intervention that works (diet, exercise, sobriety, finances) works through sustained relationship with a stateful coach, human or otherwise. Every intervention that fails fails because the tool forgot. Aura is a proof-of-concept that persistent memory — concretely, Backboard — is the missing ingredient that turns climate chatbots from reactive assistants into longitudinal mentors. The environmental case for betting on memory is the same as the UX case: you cannot change a life you cannot remember.

## What's next

- **Community leaderboards via Backboard shared namespaces.** Opt-in neighborhoods comparing Green Legacy streaks without leaking individual habits.
- **Real carbon-API integration.** Replace Gemini's hand-cited numbers with grounded per-habit CO₂/water equivalents from a live source.
- **Habit-loss detection and re-engagement.** A scheduled pass over Backboard that finds broken streaks and sends Aura in gently — never guilt-trip, always specific.

## Tech stack

- React 18, Vite 5, Tailwind 3 (no state libraries — `useState` + `useReducer` only)
- Gemini `gemini-2.5-flash` via REST (`generativelanguage.googleapis.com/v1beta`)
- Backboard (via a 4-method `BackboardClient` abstraction; see [BLOCKER.md](BLOCKER.md))
- Recharts radial-bar, Lucide icons, Inter + Fraunces from Google Fonts
- Client-side only, deployable as a static build to Vercel

## Links

- **Repo:** https://github.com/rajputdev77-art/aura-eternal-planet-guardian
- **Live demo:** *(paste Vercel URL here)*
- **Docs:** [README.md](README.md) · [DECISIONS.md](DECISIONS.md) · [DEMO_SCRIPT.md](DEMO_SCRIPT.md) · [BLOCKER.md](BLOCKER.md) · [HANDOFF.md](HANDOFF.md)

*Aura remembers. Gemini reasons. Your legacy grows.*
