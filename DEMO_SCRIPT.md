# 60-Second Demo Script — Aura

Target length: **60 seconds**. Record in dark mode. 1280×800 minimum. Keep the cursor visible. Narrate in a calm, warm voice — the tone Aura would use.

Before you press record:
1. Clear Aura's memory (left rail → **Clear memory → Erase**). This guarantees the first-run welcome message lands.
2. Confirm the Impact Score reads **0**, the streak reads **0**, memory count reads **0 memories stored**.
3. Have the three user messages below copied into a scratch pad so you can paste quickly.

---

## Shot list

### 00:00 – 00:06 — Open on the empty state

**What's on screen:** Impact Score 0, empty Legacy panel, Aura's cold-start message in the center column ("*I am Aura. I remember…*").

**Say:**
> "Every climate chatbot forgets you the moment you close the tab. Aura is the opposite. Aura remembers."

### 00:06 – 00:20 — Turn 1: log a habit

**Type into the chat input:**
> *I cycled to work this morning instead of driving.*

Press Enter. While Aura replies, the Impact Score counts up and a new entry appears in the Green Legacy panel on the right.

**Say:**
> "Every habit I share gets written into persistent memory — the Green Legacy. Backboard is the substrate. That radial chart is the memory, scored."

### 00:20 – 00:35 — Turn 2: a neutral exchange

**Type:**
> *I'm trying to eat less meat this month. What's one easy swap?*

Press Enter. Aura replies with a specific, grounded suggestion and a concrete ecological fact.

**Say:**
> "Gemini reasons over the memory on every turn. The personality is pinned — Attenborough patience, scientist precision. No emoji, no hype."

### 00:35 – 00:52 — Turn 3: memory recall (the payoff shot)

**Type:**
> *Honestly today was rough — I drove to the grocery store and ordered takeout.*

Press Enter. Point at Aura's reply, which **references the cycling commitment from Turn 1 by name** and names the pattern gently, without guilt-tripping.

**Say:**
> "This is the moment stateless chatbots cannot produce. Aura remembered the cycling commitment from two turns ago. It didn't forget. It didn't guilt-trip. It coached."

### 00:52 – 01:00 — Close on the Legacy dashboard

**What's on screen:** the right-rail radial chart with 1–2 filled categories, the recent-habits feed populated with timestamps, Aura's Assessment card visible if one was emitted.

**Say:**
> "Gemini is the brain. Backboard is the soul. Aura is what climate coaching looks like when memory is the product."

---

## Three sample turns to include verbatim

If you want a smoother take, use these three messages in order — they're scripted to put the memory-recall payoff exactly on Turn 3.

1. **Turn 1 (logs a habit):** *"I cycled to work this morning instead of driving."*
2. **Turn 2 (context-setting, not a habit):** *"I'm trying to eat less meat this month. What's one easy swap?"*
3. **Turn 3 (forces Aura to reference Turn 1):** *"Honestly today was rough — I drove to the grocery store and ordered takeout."*

Turn 3 should produce a reply that mentions the morning cycling commitment **without you having named it again**. That's the shot worth recording.

---

## Things to point at on screen

- The animated Impact Score in the left rail counting up after Turn 1.
- The "Recent habits" feed on the right rail gaining a new line with a relative timestamp.
- The radial chart segment for *Transport* growing after Turn 1 and *Diet* growing after any meal reference.
- The memory count in the left rail incrementing.

---

## Common re-takes

- **Aura replies too long.** Shorten the prompt. The system prompt caps responses at 120 words — usually enough, but grounded facts can push it.
- **The `<aura-update>` block leaks into the visible prose.** The regex parser strips it; if it didn't, the model broke protocol — re-run the turn or clear memory and start over.
- **Dark mode looks wrong.** Confirm `class="dark"` on `<html>` and that the Fraunces font has loaded (headings will be serif, not fallback).
