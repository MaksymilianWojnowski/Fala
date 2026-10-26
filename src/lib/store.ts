import { createStore, entries, get, set, update, values, type UseStore } from 'idb-keyval';
import type { CardState, ReviewLog, Settings, Snapshot, Store, UnitState } from './types';

export const DEFAULT_SETTINGS: Settings = {
  minutes: 10,
  newPerDay: 10,
  tu: false,
  strictAccents: false,
  accentCombos: true,
  theme: 'system',
  streak: true,
  updatedAt: 0,
};

// Stores are created on first use so importing this module in node (tests) never touches IndexedDB.
let cached: Store | undefined;

export function idbStore(): Store {
  if (cached) return cached;
  void navigator.storage?.persist?.();
  const cards: UseStore = createStore('fala-cards', 'kv');
  const logs: UseStore = createStore('fala-logs', 'kv');
  const units: UseStore = createStore('fala-units', 'kv');
  const meta: UseStore = createStore('fala-meta', 'kv');

  const store: Store = {
    async cards() {
      return new Map(await entries<string, CardState>(cards));
    },
    putCard: (c) => set(c.id, c, cards),
    async logs() {
      return values<ReviewLog>(logs);
    },
    addLog: (l) => set(l.id, l, logs),
    async units() {
      return new Map(await entries<string, UnitState>(units));
    },
    putUnit: (u) => set(u.id, u, units),
    async settings() {
      return { ...DEFAULT_SETTINGS, ...(await get<Settings>('settings', meta)) };
    },
    putSettings: (s) => set('settings', s, meta),
    async device() {
      let id = await get<string>('device', meta);
      if (!id) {
        id = crypto.randomUUID();
        await set('device', id, meta);
      }
      return id;
    },
    async snapshot() {
      const [c, l, u, settings] = await Promise.all([store.cards(), store.logs(), store.units(), store.settings()]);
      return { cards: [...c.values()], logs: l, units: [...u.values()], settings };
    },
    // Upsert-if-newer, never deletes. Each record is read and written in one transaction,
    // so a local write that lands during a sync is never overwritten by an older copy.
    async applyRemote(s) {
      await Promise.all([
        ...s.cards.map((c) => update<CardState | undefined>(c.id, (old) => (!old || c.updatedAt > old.updatedAt ? c : old), cards)),
        ...s.logs.map((l) => update<ReviewLog | undefined>(l.id, (old) => old ?? l, logs)),
        ...s.units.map((u) => update<UnitState | undefined>(u.id, (old) => (!old || u.updatedAt > old.updatedAt ? u : old), units)),
        update<Settings | undefined>('settings', (old) => (!old || s.settings.updatedAt > old.updatedAt ? s.settings : old), meta),
      ]);
    },
  };
  cached = store;
  return store;
}

// Starts a unit. A known unit stays known.
export async function startLearning(store: Store, id: string): Promise<void> {
  const status = (await store.units()).get(id)?.status === 'known' ? 'known' : 'learning';
  await store.putUnit({ id, status, updatedAt: Date.now() });
}

export function memoryStore(init: Partial<Snapshot> = {}): Store {
  const cards = new Map((init.cards ?? []).map((c) => [c.id, c]));
  const logs = new Map((init.logs ?? []).map((l) => [l.id, l]));
  const units = new Map((init.units ?? []).map((u) => [u.id, u]));
  let settings: Settings = { ...DEFAULT_SETTINGS, ...init.settings };
  const device = 'memory-device';

  return {
    async cards() {
      return new Map(cards);
    },
    async putCard(c) {
      cards.set(c.id, c);
    },
    async logs() {
      return [...logs.values()];
    },
    async addLog(l) {
      logs.set(l.id, l);
    },
    async units() {
      return new Map(units);
    },
    async putUnit(u) {
      units.set(u.id, u);
    },
    async settings() {
      return { ...settings };
    },
    async putSettings(s) {
      settings = s;
    },
    async device() {
      return device;
    },
    async snapshot() {
      return { cards: [...cards.values()], logs: [...logs.values()], units: [...units.values()], settings: { ...settings } };
    },
    async applyRemote(s) {
      for (const c of s.cards) {
        const old = cards.get(c.id);
        if (!old || c.updatedAt > old.updatedAt) cards.set(c.id, c);
      }
      for (const l of s.logs) if (!logs.has(l.id)) logs.set(l.id, l);
      for (const u of s.units) {
        const old = units.get(u.id);
        if (!old || u.updatedAt > old.updatedAt) units.set(u.id, u);
      }
      if (s.settings.updatedAt > settings.updatedAt) settings = { ...s.settings };
    },
  };
}
