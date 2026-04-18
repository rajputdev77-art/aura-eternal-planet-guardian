export const GEMINI_MODEL = 'gemini-2.5-flash';

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

  const backoffs = [0, 600, 1800];
  let lastError;
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt]) await sleep(backoffs[attempt]);
    try {
      const res = await fetch(ENDPOINT(GEMINI_MODEL, apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Gemini transient error ${res.status}`);
        lastError.status = res.status;
        continue;
      }
      if (!res.ok) {
        const payload = await res.text().catch(() => '');
        const err = new Error(`Gemini error ${res.status}: ${payload.slice(0, 240)}`);
        err.status = res.status;
        throw err;
      }
      const raw = await res.json();
      return { text: extractText(raw), raw };
    } catch (e) {
      lastError = e;
      if (e.status && e.status !== 429 && e.status < 500) throw e;
    }
  }
  throw lastError ?? new Error('Gemini request failed');
}
