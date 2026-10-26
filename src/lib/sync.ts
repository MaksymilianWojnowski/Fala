import type { CardState, ReviewLog, Snapshot, Store, UnitState } from './types';

const byId = <T extends { id: string }>(xs: T[]): T[] => [...xs].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

// The copy with the larger updatedAt wins, per id.
function newest<T extends { id: string; updatedAt: number }>(a: T[], b: T[]): T[] {
  const m = new Map(a.map((x) => [x.id, x]));
  for (const y of b) {
    const x = m.get(y.id);
    if (!x || y.updatedAt > x.updatedAt) m.set(y.id, y);
  }
  return byId([...m.values()]);
}

export function newSyncCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function merge(a: Snapshot, b: Snapshot): Snapshot {
  const logs = new Map([...a.logs, ...b.logs].map((l: ReviewLog) => [l.id, l]));
  return {
    cards: newest<CardState>(a.cards, b.cards),
    units: newest<UnitState>(a.units, b.units),
    logs: byId([...logs.values()]),
    settings: b.settings.updatedAt > a.settings.updatedAt ? b.settings : a.settings,
  };
}

// JSON turns Dates into strings; ts-fsrs needs real Dates back.
export function reviveSnapshot(raw: unknown): Snapshot {
  const s = raw as Snapshot;
  for (const c of s.cards) {
    c.fsrs.due = new Date(c.fsrs.due);
    if (c.fsrs.last_review) c.fsrs.last_review = new Date(c.fsrs.last_review);
  }
  return s;
}

// GET remote → merge with local → save locally → PUT merged back.
export async function syncNow(
  store: Store,
  code: string,
  base: string,
  fetchFn: typeof fetch = fetch,
): Promise<'ok' | 'offline' | 'error'> {
  const url = `${base}/v1/state/${code}`;
  try {
    const res = await fetchFn(url);
    if (!res.ok && res.status !== 404) return 'error';
    const remote = res.status === 404 ? undefined : reviveSnapshot(await res.json());
    const local = await store.snapshot();
    const merged = remote ? merge(local, remote) : local;
    await store.replace(merged);
    const put = await fetchFn(url, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(merged),
    });
    return put.ok ? 'ok' : 'error';
  } catch (e) {
    return e instanceof TypeError ? 'offline' : 'error';
  }
}

// Unset means sync is off: the app never calls the worker and Settings says so.
export const SYNC_URL = (import.meta.env.VITE_SYNC_URL as string | undefined) || undefined;
export const isSyncCode = (s: string) => /^[A-Za-z0-9_-]{22}$/.test(s);

type SyncResult = { result: 'ok' | 'offline' | 'error'; at: number };
let last: SyncResult | undefined;
const listeners = new Set<() => void>();
export const subscribeSync = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export const getSyncStatus = () => last;

// Chained so overlapping triggers (app open, session end, timer) never run two syncs at once.
let queue: Promise<void> = Promise.resolve();
export function runSync(store: Store): Promise<void> {
  queue = queue.then(async () => {
    const code = (await store.settings()).syncCode;
    if (!SYNC_URL || !code) return;
    last = { result: await syncNow(store, code, SYNC_URL), at: Date.now() };
    listeners.forEach((cb) => cb());
  }).catch(() => undefined);
  return queue;
}
