const USER_ID_KEY = 'aura:userId';

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

// NOTE: This is the abstraction layer for Backboard. The real SDK is not wired in yet
// (see BLOCKER.md). Every method is async so the swap is a drop-in replacement —
// App.jsx never needs to change.
export class BackboardClient {
  constructor() {
    this.userId = ensureUserId();
    this.prefix = `aura:${this.userId}:memory:`;
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
    const full = this.prefix + key;
    const entry = {
      key,
      value,
      createdAt: Date.now(),
    };
    localStorage.setItem(full, JSON.stringify(entry));
    return entry;
  }

  async getMemory(key) {
    const raw = localStorage.getItem(this.prefix + key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async listMemories() {
    const keys = this._keys();
    const memories = [];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        memories.push(JSON.parse(raw));
      } catch {
        /* skip malformed */
      }
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

export const backboard = new BackboardClient();
