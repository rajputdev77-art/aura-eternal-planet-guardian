// ---------------------------------------------------------------------------
// BackboardClient — talks to the real Backboard API when VITE_BACKBOARD_API_KEY
// is present, falls back to localStorage when it isn't. Both code paths return
// the same shape so App.jsx never needs to know which backend is live.
//
// Real-API endpoints (from https://github.com/Backboard-io/backboard_io_cookbook):
//   POST   /api/assistants                              create assistant
//   GET    /api/assistants                              list assistants
//   POST   /api/assistants/{aid}/memories               add memory  {content, metadata?}
//   GET    /api/assistants/{aid}/memories               list memories  -> {memories[]}
//   DELETE /api/assistants/{aid}/memories/{memoryId}    delete one
//
// Auth: header `X-API-Key: ${key}`. Per-user isolation: one assistant per user,
// named `aura-user-${userId}`. The userId is created locally and persisted in
// localStorage so the same person gets the same assistant across sessions.
// ---------------------------------------------------------------------------

const USER_ID_KEY = 'aura:userId';
const ASSISTANT_ID_KEY = 'aura:assistantId';
const BB_BASE_URL = 'https://app.backboard.io/api';
const ASSISTANT_NAME_PREFIX = 'aura-user-';

function ensureUserId() {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id =
        (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
        `u_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch {
    return 'anonymous';
  }
}

// ---------------------------------------------------------------------------
// LocalStorage backend — also serves as the fallback when the real API errors.
// ---------------------------------------------------------------------------
class LocalStorageBackend {
  constructor(userId) {
    this.userId = userId;
    this.prefix = `aura:${userId}:memory:`;
  }

  _keys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) out.push(k);
    }
    return out;
  }

  async saveMemory(key, value) {
    const entry = { key, value, createdAt: Date.now() };
    localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    return entry;
  }

  async getMemory(key) {
    const raw = localStorage.getItem(this.prefix + key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  async listMemories() {
    const memories = [];
    for (const k of this._keys()) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try { memories.push(JSON.parse(raw)); } catch { /* skip */ }
    }
    memories.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    return memories;
  }

  async clearMemories() {
    const keys = this._keys();
    for (const k of keys) localStorage.removeItem(k);
    return keys.length;
  }
}

// ---------------------------------------------------------------------------
// Real Backboard backend — same async surface, talks HTTPS.
// Each App-level "memory" is one Backboard memory whose `content` is the
// JSON-serialised entry and whose `metadata.key` carries the addressable key.
// We keep an in-memory copy of the assistant_id so we don't ping listAssistants
// on every call.
// ---------------------------------------------------------------------------
class BackboardBackend {
  constructor(userId, apiKey) {
    this.userId = userId;
    this.apiKey = apiKey;
    this.baseUrl = BB_BASE_URL;
    this.assistantName = `${ASSISTANT_NAME_PREFIX}${userId}`;
    this.assistantId = null;
    try {
      this.assistantId = localStorage.getItem(ASSISTANT_ID_KEY) || null;
    } catch { /* ignore */ }
  }

  _headers(json = false) {
    const h = { 'X-API-Key': this.apiKey };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  async _request(method, path, opts = {}) {
    const url = `${this.baseUrl}${path}`;
    const init = { method, headers: this._headers(!!opts.json) };
    if (opts.json) init.body = JSON.stringify(opts.json);
    if (opts.formData) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(opts.formData)) fd.append(k, v);
      init.body = fd;
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Backboard ${method} ${path} -> ${res.status}: ${body.slice(0, 200)}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async _ensureAssistant() {
    if (this.assistantId) return this.assistantId;
    const list = await this._request('GET', '/assistants?skip=0&limit=200');
    const arr = Array.isArray(list) ? list : list?.assistants ?? [];
    const existing = arr.find((a) => a?.name === this.assistantName);
    if (existing) {
      this.assistantId = existing.assistant_id ?? existing.id;
    } else {
      const created = await this._request('POST', '/assistants', {
        json: {
          name: this.assistantName,
          description: `Aura green-legacy memory store for user ${this.userId}`,
          system_prompt: 'Long-term ecological habit memory for the Aura coach.',
        },
      });
      this.assistantId = created?.assistant_id ?? created?.id;
    }
    if (!this.assistantId) throw new Error('Backboard: could not resolve assistant_id');
    try { localStorage.setItem(ASSISTANT_ID_KEY, this.assistantId); } catch { /* ignore */ }
    return this.assistantId;
  }

  async saveMemory(key, value) {
    const aid = await this._ensureAssistant();
    const createdAt = Date.now();
    const content = JSON.stringify({ key, value, createdAt });
    const result = await this._request('POST', `/assistants/${aid}/memories`, {
      json: {
        content,
        metadata: { key, createdAt, source: 'aura' },
      },
    });
    return {
      key,
      value,
      createdAt,
      _bbId: result?.memory_id ?? result?.id ?? null,
    };
  }

  async getMemory(key) {
    const all = await this.listMemories();
    return all.find((m) => m.key === key) ?? null;
  }

  async listMemories() {
    const aid = await this._ensureAssistant();
    const res = await this._request('GET', `/assistants/${aid}/memories`);
    const raw = res?.memories ?? (Array.isArray(res) ? res : []);
    const out = [];
    for (const m of raw) {
      const meta = m?.metadata ?? {};
      let parsed = null;
      try { parsed = m?.content ? JSON.parse(m.content) : null; } catch { /* skip */ }
      if (!parsed) continue;
      out.push({
        key: parsed.key ?? meta.key ?? m.id,
        value: parsed.value,
        createdAt:
          parsed.createdAt ??
          meta.createdAt ??
          (Date.parse(m?.created_at ?? '') || 0),
        _bbId: m.id,
      });
    }
    out.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    return out;
  }

  async clearMemories() {
    const aid = await this._ensureAssistant();
    const all = await this.listMemories();
    await Promise.all(
      all
        .filter((m) => m._bbId)
        .map((m) =>
          this._request('DELETE', `/assistants/${aid}/memories/${m._bbId}`).catch(() => null)
        )
    );
    return all.length;
  }
}

// ---------------------------------------------------------------------------
// Public client — picks the backend, transparently falls back on first failure
// so a stray network/CORS issue doesn't brick the demo.
// ---------------------------------------------------------------------------
export class BackboardClient {
  constructor() {
    this.userId = ensureUserId();
    this.prefix = `aura:${this.userId}:memory:`;
    const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKBOARD_API_KEY) || '';
    this.local = new LocalStorageBackend(this.userId);
    this.backend = apiKey
      ? new BackboardBackend(this.userId, apiKey)
      : this.local;
    this.mode = apiKey ? 'backboard' : 'localStorage';
    this._failedOver = false;
  }

  async _run(method, ...args) {
    try {
      return await this.backend[method](...args);
    } catch (e) {
      if (this.backend !== this.local && !this._failedOver) {
        console.warn(
          `[Backboard] ${method} failed, falling back to localStorage. Reason:`,
          e?.message ?? e
        );
        this._failedOver = true;
        this.backend = this.local;
        this.mode = 'localStorage (fallback)';
        return this.local[method](...args);
      }
      throw e;
    }
  }

  saveMemory(key, value) { return this._run('saveMemory', key, value); }
  getMemory(key)         { return this._run('getMemory', key); }
  listMemories()         { return this._run('listMemories'); }
  clearMemories()        { return this._run('clearMemories'); }
}

export const backboard = new BackboardClient();
