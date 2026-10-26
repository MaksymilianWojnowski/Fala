import { createEmptyCard } from 'ts-fsrs';
import { expect, test } from 'vitest';
import { merge, newSyncCode, reviveSnapshot, syncNow } from './sync';
import { DEFAULT_SETTINGS, memoryStore } from './store';
import type { CardState, ReviewLog, Snapshot } from './types';

const card = (id: string, updatedAt: number, due: number): CardState => ({
  id, fsrs: createEmptyCard(new Date(due)), updatedAt, passes: 0, introduced: '2026-10-24',
});
const log = (id: string): ReviewLog => ({ id, cardId: 'c:falar:pres', at: 1, rating: 3, device: 'd' });
const empty: Snapshot = { cards: [], logs: [], units: [], settings: { ...DEFAULT_SETTINGS } };
const DAY = Date.UTC(2026, 9, 24);

test('sync code is 22 url-safe characters', () => {
  expect(newSyncCode()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(newSyncCode()).not.toBe(newSyncCode());
});

test('newer card wins both ways', () => {
  const a: Snapshot = { ...empty, cards: [card('c1', 1, DAY)] };
  const b: Snapshot = { ...empty, cards: [card('c1', 2, DAY + 864e5)] };
  expect(merge(a, b)).toEqual(merge(b, a));
  expect(merge(a, b).cards[0].updatedAt).toBe(2);
});

test('logs union without duplicates, sorted by id', () => {
  const a: Snapshot = { ...empty, logs: [log('l2'), log('l1')] };
  const b: Snapshot = { ...empty, logs: [log('l2'), log('l3')] };
  expect(merge(a, b).logs.map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
});

test('settings: larger updatedAt wins', () => {
  const a: Snapshot = { ...empty, settings: { ...DEFAULT_SETTINGS, minutes: 5, updatedAt: 1 } };
  const b: Snapshot = { ...empty, settings: { ...DEFAULT_SETTINGS, minutes: 20, updatedAt: 2 } };
  expect(merge(a, b).settings.minutes).toBe(20);
  expect(merge(b, a).settings.minutes).toBe(20);
});

test('idempotent', () => {
  const a: Snapshot = { ...empty, cards: [card('c1', 1, DAY)], logs: [log('l1')] };
  const b: Snapshot = { ...empty, cards: [card('c2', 2, DAY)], logs: [log('l2')] };
  expect(merge(a, merge(a, b))).toEqual(merge(a, b));
});

test('empty local keeps remote', () => {
  const remote: Snapshot = {
    cards: [card('c1', 5, DAY)], logs: [log('l1')], units: [{ id: 'u1', status: 'known', updatedAt: 5 }],
    settings: { ...DEFAULT_SETTINGS, updatedAt: 5 },
  };
  expect(merge(empty, remote)).toEqual(remote);
});

test('revive restores Dates', () => {
  const snap: Snapshot = { ...empty, cards: [card('c1', 1, DAY)] };
  const r = reviveSnapshot(JSON.parse(JSON.stringify(snap)));
  expect(r.cards[0].fsrs.due).toBeInstanceOf(Date);
  expect(+r.cards[0].fsrs.due).toBe(+snap.cards[0].fsrs.due);
});

test('404 remote → PUTs local, ok', async () => {
  const store = memoryStore({ cards: [card('c1', 1, DAY)] });
  const puts: string[] = [];
  const fake = (async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      puts.push(String(init.body));
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  }) as unknown as typeof fetch;
  expect(await syncNow(store, 'A'.repeat(22), 'https://sync.test', fake)).toBe('ok');
  expect(JSON.parse(puts[0]).cards.map((c: CardState) => c.id)).toEqual(['c1']);
});

test('network error → offline, store unchanged', async () => {
  const store = memoryStore({ cards: [card('c1', 1, DAY)] });
  const before = await store.snapshot();
  const fake = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
  expect(await syncNow(store, 'A'.repeat(22), 'https://sync.test', fake)).toBe('offline');
  expect(await store.snapshot()).toEqual(before);
});
