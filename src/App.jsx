import React, { useEffect, useMemo, useRef, useState, useCallback, useReducer } from 'react';
import {
  Leaf,
  Send,
  Sun,
  Moon,
  Trash2,
  Sparkles,
  Flame,
  TreePine,
  MessageCircle,
  BarChart3,
  ScrollText,
} from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { askGemini, GEMINI_MODEL } from './lib/gemini.js';
import { backboard } from './lib/backboard.js';
import {
  computeImpactScore,
  CATEGORIES,
  CATEGORY_LABELS,
} from './lib/impactEngine.js';

// ---------------------------------------------------------------------------
// SYSTEM PROMPT — verbatim from the challenge spec.
// `{MEMORY_JSON_HERE}` is replaced with the live Backboard memory payload at
// request time. Do not edit this constant except to match a canonical update.
// ---------------------------------------------------------------------------
const AURA_SYSTEM_PROMPT = `You are Aura, an eternal planet guardian and personal ecological coach. Personality: encouraging, wise, scientific. You speak with the calm authority of a seasoned naturalist — Attenborough's patience, a scientist's precision, a mentor's warmth. No exclamation points unless the user achieves something genuinely significant. No emoji unless asked.
You have access to the user's Long-Term Green Memory, provided below as JSON. Reference specific past commitments when responding. When the user logs a new habit, acknowledge it with a concrete ecological fact (e.g., "A reusable bottle displaces roughly 156 single-use plastic bottles per year"). If they regress or disappear, be gently direct — never guilt-trip.
After your prose response, you MUST emit one block in this exact format:
<aura-update>
{"newHabits": ["..."], "updatedGoals": [], "impactDelta": <integer>, "assessment": "<2-sentence trajectory summary or null>"}
</aura-update>
User's Long-Term Green Memory:
{MEMORY_JSON_HERE}`;

const UPDATE_RE = /<aura-update>([\s\S]*?)<\/aura-update>/i;

function parseAuraUpdate(text) {
  const m = text.match(UPDATE_RE);
  const clean = text.replace(UPDATE_RE, '').trim();
  if (!m) return { clean, update: null };
  try {
    return { clean, update: JSON.parse(m[1].trim()) };
  } catch {
    return { clean, update: null };
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
function useCountUp(value, durationMs = 600) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef(null);
  const fromRef = useRef(value);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    const from = fromRef.current;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (value - from) * eased);
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return display;
}

function timeAgo(ts) {
  if (!ts) return '';
  const delta = Date.now() - ts;
  const s = Math.floor(delta / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function computeStreak(memories) {
  if (!memories.length) return 0;
  const habitMemories = memories.filter((m) => m?.value?.habit && m?.createdAt);
  if (!habitMemories.length) return 0;
  const days = new Set(
    habitMemories.map((m) => new Date(m.createdAt).toISOString().slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Chat reducer — keeps message-list state transitions explicit and cheap.
// ---------------------------------------------------------------------------
function chatReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return action.messages;
    case 'APPEND':
      return [...state, action.message];
    case 'REPLACE_LAST':
      return [...state.slice(0, -1), action.message];
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Small UI pieces
// ---------------------------------------------------------------------------
function ThinkingDots({ label = 'Aura is thinking' }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-lichen"
      role="status"
      aria-label={label}
    >
      <span className="thinking-dot" aria-hidden="true" />
      <span className="thinking-dot" aria-hidden="true" />
      <span className="thinking-dot" aria-hidden="true" />
    </span>
  );
}

function MessageBubble({ role, text }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end animate-fadein">
        <div className="max-w-[80%] rounded-card rounded-tr-md bg-amber-bark/15 text-ink dark:bg-amber-bark/20 dark:text-moss-300 px-4 py-2.5 text-sm leading-[1.6]">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 animate-fadein">
      <div className="mt-1 flex-none">
        <div className="h-7 w-7 rounded-full bg-lichen/15 dark:bg-lichen/20 grid place-items-center">
          <Leaf className="h-4 w-4 text-lichen" aria-hidden="true" />
        </div>
      </div>
      <div className="max-w-[85%] text-sm leading-[1.6] whitespace-pre-wrap text-ink dark:text-moss-300">
        {text || <ThinkingDots />}
      </div>
    </div>
  );
}

function ImpactScore({ score }) {
  const animated = useCountUp(score);
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-[0.18em] text-ink/60 dark:text-moss-300/70">
        Impact Score
      </span>
      <span
        className="wordmark text-5xl md:text-6xl font-semibold text-ink dark:text-moss-300 tabular-nums mt-1"
        aria-live="polite"
        aria-atomic="true"
      >
        {animated}
      </span>
      <span className="text-xs text-ink/60 dark:text-moss-300/70">
        of 1000 — your Green Legacy
      </span>
    </div>
  );
}

function LegacyDashboard({ memories, assessment, breakdown }) {
  const data = useMemo(() => {
    const palette = {
      transport: '#7BAE6F',
      diet: '#9BCB93',
      energy: '#C08B4C',
      reusables: '#D3CCB8',
    };
    return CATEGORIES.map((cat) => ({
      name: CATEGORY_LABELS[cat],
      key: cat,
      value: breakdown[cat]?.count ?? 0,
      fill: palette[cat],
    }));
  }, [breakdown]);

  const recent = useMemo(() => {
    return [...memories]
      .filter((m) => m?.value?.habit)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 5);
  }, [memories]);

  const maxDomain = Math.max(10, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-4">
      <section className="panel p-4" aria-labelledby="legacy-heading">
        <div className="flex items-center gap-2 mb-2">
          <TreePine className="h-4 w-4 text-lichen" aria-hidden="true" />
          <h3 id="legacy-heading" className="heading-serif text-lg text-ink dark:text-moss-300">
            Green Legacy
          </h3>
        </div>
        <div className="h-48" role="img" aria-label="Radial chart of habit categories">
          <ResponsiveContainer>
            <RadialBarChart
              innerRadius="30%"
              outerRadius="100%"
              data={data}
              startAngle={90}
              endAngle={-270}
              barSize={10}
            >
              <PolarAngleAxis type="number" domain={[0, maxDomain]} tick={false} />
              <RadialBar
                background={{ fill: 'rgba(123, 174, 111, 0.10)' }}
                dataKey="value"
                cornerRadius={6}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(11, 31, 23, 0.94)',
                  border: '1px solid rgba(123, 174, 111, 0.35)',
                  borderRadius: 12,
                  color: '#C7E5C5',
                  fontSize: 12,
                }}
                formatter={(v, _n, p) => [`${v} habits`, p?.payload?.name]}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <ul className="grid grid-cols-2 gap-y-1 gap-x-3 mt-2 text-xs">
          {data.map((d) => (
            <li key={d.key} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-none"
                style={{ background: d.fill }}
                aria-hidden="true"
              />
              <span className="flex-1 text-ink/80 dark:text-moss-300/90">{d.name}</span>
              <span className="tabular-nums text-ink/70 dark:text-moss-300/80">{d.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-4" aria-labelledby="recent-heading">
        <div className="flex items-center gap-2 mb-2">
          <ScrollText className="h-4 w-4 text-lichen" aria-hidden="true" />
          <h3 id="recent-heading" className="heading-serif text-lg text-ink dark:text-moss-300">
            Recent habits
          </h3>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-ink/60 dark:text-moss-300/70">
            Nothing yet. Tell Aura about something small you did today — a walk, a meatless meal, a reused bottle.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((m, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <Leaf className="h-3.5 w-3.5 mt-1 flex-none text-lichen" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{m.value.habit}</div>
                  <div className="text-[11px] text-ink/55 dark:text-moss-300/60">
                    <time dateTime={new Date(m.createdAt).toISOString()}>
                      {timeAgo(m.createdAt)}
                    </time>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel p-4" aria-labelledby="assessment-heading">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-lichen" aria-hidden="true" />
          <h3 id="assessment-heading" className="heading-serif text-lg text-ink dark:text-moss-300">
            Aura&rsquo;s assessment
          </h3>
        </div>
        <p className="text-sm leading-[1.6] text-ink/85 dark:text-moss-300/90 italic">
          {assessment ||
            'No assessment yet. Aura will offer one once a clearer pattern emerges across your habits.'}
        </p>
      </section>
    </div>
  );
}

function LeftRail({ score, streak, memoryCount, theme, onToggleTheme, onClear }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-5 h-full">
      <header>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-card bg-lichen/15 dark:bg-lichen/20 grid place-items-center">
            <Leaf className="h-5 w-5 text-lichen" aria-hidden="true" />
          </div>
          <div>
            <h1 className="wordmark text-[28px] leading-none text-ink dark:text-moss-300">
              Aura
            </h1>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink/55 dark:text-moss-300/65 mt-1">
              Eternal Planet Guardian
            </div>
          </div>
        </div>
      </header>

      <div className="panel p-5">
        <ImpactScore score={score} />
      </div>

      <div className="panel p-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-lichen" aria-hidden="true" />
          <span className="text-xs uppercase tracking-[0.18em] text-ink/60 dark:text-moss-300/70">
            Streak
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="wordmark text-3xl text-ink dark:text-moss-300 tabular-nums">
            {streak}
          </span>
          <span className="text-sm text-ink/60 dark:text-moss-300/70">
            day{streak === 1 ? '' : 's'}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-ink/55 dark:text-moss-300/60">
          {memoryCount} memor{memoryCount === 1 ? 'y' : 'ies'} stored
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn-ghost justify-start"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn-ghost justify-start"
            aria-label="Clear Aura's memory"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Clear memory</span>
          </button>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-btn border border-stone dark:border-canopy p-2" role="alertdialog" aria-label="Confirm clear memory">
            <span className="text-xs text-ink/90 dark:text-moss-300">
              Erase every memory? This cannot be undone.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-danger flex-1 justify-center"
                onClick={async () => {
                  await onClear();
                  setConfirming(false);
                }}
              >
                Erase
              </button>
              <button
                type="button"
                className="btn-ghost flex-1 justify-center"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="text-[10px] text-ink/50 dark:text-moss-300/55 mt-2">
          Model: {GEMINI_MODEL}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [memories, setMemories] = useState([]);
  const [messages, dispatchMessages] = useReducer(chatReducer, []);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [mobileTab, setMobileTab] = useState('chat');

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    (async () => {
      const existing = await backboard.listMemories();
      setMemories(existing);
      const hasAny = existing.length > 0;
      dispatchMessages({
        type: 'SET',
        messages: [
          {
            role: 'assistant',
            content: hasAny
              ? `Welcome back. I still have ${existing.length} memor${existing.length === 1 ? 'y' : 'ies'} of your journey — your habits, your streaks, your honest moments. Where shall we pick up?`
              : `I am Aura. I remember. Not in the anxious way that tracks you — in the patient way that walks beside you. Tell me what you did today for the planet, or what you wish you had. Small counts.`,
          },
        ],
      });
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const { score, breakdown } = useMemo(() => computeImpactScore(memories), [memories]);
  const streak = useMemo(() => computeStreak(memories), [memories]);

  const assessment = useMemo(() => {
    const withAssessment = [...memories]
      .filter((m) => m?.value?.assessment)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return withAssessment[0]?.value?.assessment ?? null;
  }, [memories]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      try {
        localStorage.setItem('aura:theme', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearMemory = useCallback(async () => {
    await backboard.clearMemories();
    setMemories([]);
    dispatchMessages({
      type: 'SET',
      messages: [
        {
          role: 'assistant',
          content:
            'The slate is clean. I remember nothing, and I will not pretend otherwise. When you are ready, start again with one small thing.',
        },
      ],
    });
  }, []);

  const send = useCallback(
    async (raw) => {
      const text = (raw ?? input).trim();
      if (!text || sending) return;
      setInput('');
      setError(null);
      setSending(true);

      const nextMessages = [...messages, { role: 'user', content: text }];
      dispatchMessages({ type: 'APPEND', message: { role: 'user', content: text } });

      try {
        const currentMemories = await backboard.listMemories();
        const memoryPayload = currentMemories.slice(-40).map((m) => ({
          at: new Date(m.createdAt).toISOString(),
          key: m.key,
          value: m.value,
        }));
        const systemPrompt = AURA_SYSTEM_PROMPT.replace(
          '{MEMORY_JSON_HERE}',
          JSON.stringify(memoryPayload, null, 2)
        );

        const { text: reply } = await askGemini(nextMessages, systemPrompt);
        const { clean, update } = parseAuraUpdate(reply || '');
        dispatchMessages({
          type: 'APPEND',
          message: { role: 'assistant', content: clean || '(no reply)' },
        });

        const stamp = Date.now();
        const writes = [];
        if (update && Array.isArray(update.newHabits)) {
          update.newHabits.forEach((h, i) => {
            if (typeof h === 'string' && h.trim()) {
              writes.push(
                backboard.saveMemory(`habit:${stamp}:${i}`, { habit: h.trim(), source: 'aura' })
              );
            }
          });
        }
        if (update && Array.isArray(update.updatedGoals)) {
          update.updatedGoals.forEach((g, i) => {
            if (typeof g === 'string' && g.trim()) {
              writes.push(
                backboard.saveMemory(`goal:${stamp}:${i}`, { goal: g.trim(), source: 'aura' })
              );
            }
          });
        }
        if (update && typeof update.assessment === 'string' && update.assessment.trim()) {
          writes.push(
            backboard.saveMemory(`assessment:${stamp}`, {
              assessment: update.assessment.trim(),
              source: 'aura',
            })
          );
        }
        if (update && typeof update.impactDelta === 'number' && update.impactDelta !== 0) {
          writes.push(
            backboard.saveMemory(`delta:${stamp}`, {
              delta: update.impactDelta,
              source: 'aura',
            })
          );
        }
        await Promise.all(writes);
        const fresh = await backboard.listMemories();
        setMemories(fresh);
      } catch (e) {
        console.error(e);
        setError(e?.message ?? String(e));
        dispatchMessages({
          type: 'APPEND',
          message: {
            role: 'assistant',
            content:
              e?.code === 'NO_KEY'
                ? 'I cannot reach my reasoning engine yet. Please set VITE_GEMINI_API_KEY in .env and restart the dev server.'
                : `Something interrupted me. ${e?.message ?? 'Unknown error'}`,
          },
        });
      } finally {
        setSending(false);
        textareaRef.current?.focus();
      }
    },
    [input, sending, messages]
  );

  const canSend = input.trim().length > 0 && !sending;

  const MobileTabs = () => (
    <div className="md:hidden grid grid-cols-3 gap-1 p-1 rounded-card bg-stone/70 dark:bg-canopy/50" role="tablist" aria-label="Views">
      {[
        { id: 'legacy', label: 'Legacy', icon: TreePine },
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'score', label: 'Score', icon: BarChart3 },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mobileTab === id}
          onClick={() => setMobileTab(id)}
          className={`flex items-center justify-center gap-1.5 rounded-btn px-2 py-2 text-xs font-medium transition-colors ${
            mobileTab === id
              ? 'bg-white text-ink dark:bg-forest dark:text-moss-300 shadow-sm'
              : 'text-ink/70 dark:text-moss-300/80 hover:bg-white/40 dark:hover:bg-forest/40'
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen w-full">
      <a
        href="#chat-region"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-white dark:bg-canopy px-3 py-2 rounded-btn shadow"
      >
        Skip to chat
      </a>
      <div className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
        <div className="md:hidden mb-3">
          <MobileTabs />
        </div>
        <div className="grid md:grid-cols-[280px_minmax(0,1fr)_340px] lg:grid-cols-[300px_minmax(0,1fr)_380px] gap-4 md:gap-6">
          <aside
            className={`${
              mobileTab === 'score' ? 'block' : 'hidden md:block'
            } md:sticky md:top-6 md:self-start`}
            aria-label="Identity and controls"
          >
            <LeftRail
              score={score}
              streak={streak}
              memoryCount={memories.length}
              theme={theme}
              onToggleTheme={toggleTheme}
              onClear={clearMemory}
            />
          </aside>

          <section
            id="chat-region"
            className={`${
              mobileTab === 'chat' ? 'flex' : 'hidden md:flex'
            } panel flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-4rem)] overflow-hidden`}
            aria-label="Conversation with Aura"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b subtle-border">
              <MessageCircle className="h-4 w-4 text-lichen" aria-hidden="true" />
              <span className="text-sm font-medium text-ink dark:text-moss-300">
                Conversation with Aura
              </span>
              {sending && (
                <span className="ml-auto flex items-center gap-2 text-xs text-ink/60 dark:text-moss-300/70">
                  <ThinkingDots />
                  <span>thinking</span>
                </span>
              )}
            </div>
            <div
              ref={scrollRef}
              className="scroll-area flex-1 overflow-y-auto px-5 py-5 space-y-5"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.map((m, i) => (
                <MessageBubble key={i} role={m.role} text={m.content} />
              ))}
              {sending && <MessageBubble role="assistant" text="" />}
            </div>

            {error && (
              <div
                className="px-5 py-2 text-xs text-alert dark:text-alert/90 border-t subtle-border"
                role="alert"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-2 p-3 border-t subtle-border"
            >
              <label htmlFor="aura-input" className="sr-only">
                Message Aura
              </label>
              <textarea
                id="aura-input"
                ref={textareaRef}
                className="flex-1 resize-none rounded-btn border subtle-border bg-white/70 dark:bg-forest/70 text-ink dark:text-moss-300 placeholder:text-ink/40 dark:placeholder:text-moss-300/40 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-lichen"
                rows={1}
                placeholder="Tell Aura what you did today — or what you're trying to change."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={sending}
                aria-label="Message Aura"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="btn-primary h-10"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </section>

          <aside
            className={`${mobileTab === 'legacy' ? 'block' : 'hidden md:block'}`}
            aria-label="Green Legacy dashboard"
          >
            <LegacyDashboard
              memories={memories}
              assessment={assessment}
              breakdown={breakdown}
            />
          </aside>
        </div>
        <footer className="mt-8 text-center text-[11px] text-ink/55 dark:text-moss-300/55">
          Aura remembers. Gemini reasons. Your legacy grows.
        </footer>
      </div>
    </div>
  );
}
