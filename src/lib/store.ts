import { clear, createStore, entries, get, set, setMany, values, type UseStore } from 'idb-keyval';
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

const pairs = (xs: { id: string }[]) => xs.map((x) => [x.id, x] as [string, unknown]);

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
    async replace(s) {
      await Promise.all([clear(cards), clear(logs), clear(units)]);
      await Promise.all([
        setMany(pairs(s.cards), cards),
        setMany(pairs(s.logs), logs),
        setMany(pairs(s.units), units),
      ]);
      await store.putSettings(s.settings);
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
    async replace(s) {
      cards.clear();
      logs.clear();
      units.clear();
      s.cards.forEach((c) => cards.set(c.id, c));
      s.logs.forEach((l) => logs.set(l.id, l));
      s.units.forEach((u) => units.set(u.id, u));
      settings = { ...s.settings };
    },
  };
}
