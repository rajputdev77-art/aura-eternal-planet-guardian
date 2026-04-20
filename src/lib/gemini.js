export const GEMINI_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.0-flash';

const ENDPOINT = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toGeminiContents(messages) {
  return messages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

function extractText(raw) {
  try {
    const candidate = raw?.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) return '';
    return parts.map((p) => p?.text ?? '').join('').trim();
  } catch {
    return '';
  }
}

async function callModel(model, apiKey, body) {
  const res = await fetch(ENDPOINT(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export async function askGemini(messages, systemPrompt, opts = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
  if (!apiKey) {
    const err = new Error(
      'VITE_GEMINI_API_KEY is not set. Copy .env.example to .env and add your key, then restart the dev server.'
    );
    err.code = 'NO_KEY';
    throw err;
  }

  const body = {
    contents: toGeminiContents(messages),
    systemInstruction: systemPrompt
      ? { role: 'system', parts: [{ text: systemPrompt }] }
      : undefined,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      topP: 0.95,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  // Try primary model up to 4 times with jittered backoff, then fall back
  // to a sibling model (different serving stack, often available when the
  // primary is overloaded) for 2 more tries. Total ~20s worst case.
  const plan = [
    { model: GEMINI_MODEL, wait: 0 },
    { model: GEMINI_MODEL, wait: 1000 },
    { model: GEMINI_MODEL, wait: 2500 },
    { model: GEMINI_MODEL, wait: 6000 },
    { model: FALLBACK_MODEL, wait: 500 },
    { model: FALLBACK_MODEL, wait: 3000 },
  ];

  let lastError;
  for (const { model, wait } of plan) {
    if (wait) await sleep(wait + Math.floor(Math.random() * 400));
    try {
      const res = await callModel(model, apiKey, body);
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Gemini busy (${res.status}) on ${model}`);
        lastError.status = res.status;
        lastError.transient = true;
        continue;
      }
      if (!res.ok) {
        const payload = await res.text().catch(() => '');
        const err = new Error(`Gemini error ${res.status}: ${payload.slice(0, 240)}`);
        err.status = res.status;
        throw err;
      }
      const raw = await res.json();
      return { text: extractText(raw), raw, model };
    } catch (e) {
      lastError = e;
      if (e.status && e.status !== 429 && e.status < 500) throw e;
    }
  }
  const overloaded = new Error(
    'Gemini is currently overloaded. This is a temporary issue on Google\u2019s side \u2014 please try the message again in a few seconds.'
  );
  overloaded.transient = true;
  overloaded.cause = lastError;
  throw overloaded;
}
