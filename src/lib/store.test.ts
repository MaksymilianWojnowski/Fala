import { expect, test } from 'vitest';
import { memoryStore } from './store';
import type { CardState, ReviewLog, Snapshot, UnitState } from './types';

const card = (id: string, updatedAt = 1, due = 1): CardState => ({ id, fsrs: { due: new Date(due) } as CardState['fsrs'], updatedAt, passes: 0, introduced: '2026-10-24' });
const log = (id: string): ReviewLog => ({ id, cardId: 'c:a', at: 1, rating: 3, device: 'd' });
const unit = (id: string): UnitState => ({ id, status: 'learning', updatedAt: 1 });
const remote = (p: Partial<Snapshot>): Snapshot => ({ cards: [], logs: [], units: [], settings: { ...(p.settings ?? {}) } as Snapshot['settings'], ...p });

test('applyRemote adds missing records and keeps local-only ones', async () => {
  const store = memoryStore({ cards: [card('local')], logs: [log('l-local')] });
  await store.applyRemote(remote({ cards: [card('r')], logs: [log('l-remote')], units: [unit('u')] }));
  const snap = await store.snapshot();
  expect(snap.cards.map((c) => c.id).sort()).toEqual(['local', 'r']);
  expect(snap.logs.map((l) => l.id).sort()).toEqual(['l-local', 'l-remote']);
  expect(snap.units.map((u) => u.id)).toEqual(['u']);
});

test('a card written locally after snapshot survives and its newer data wins', async () => {
  const store = memoryStore({ cards: [card('c1', 1)] });
  const snap = await store.snapshot();
  expect(snap.cards).toHaveLength(1);
  await store.putCard(card('c1', 4, 4));
  await store.putCard(card('c-new', 4));
  await store.applyRemote(remote({ cards: [card('c1', 2, 2), card('c2', 1)] }));
  const byId = new Map((await store.snapshot()).cards.map((c) => [c.id, c]));
  expect([...byId.keys()].sort()).toEqual(['c-new', 'c1', 'c2']);
  expect(byId.get('c1')!.updatedAt).toBe(4);
});

test('a log added locally after snapshot survives', async () => {
  const store = memoryStore();
  await store.snapshot();
  await store.addLog(log('l-local'));
  await store.applyRemote(remote({ logs: [log('l-remote')] }));
  expect((await store.snapshot()).logs.map((l) => l.id).sort()).toEqual(['l-local', 'l-remote']);
});

test('an incoming newer card overwrites an older local one', async () => {
  const store = memoryStore({ cards: [card('c1', 1, 1)] });
  await store.applyRemote(remote({ cards: [card('c1', 2, 9)] }));
  const c = (await store.snapshot()).cards[0];
  expect([c.updatedAt, +c.fsrs.due]).toEqual([2, 9]);
});

test('settings take the incoming copy only when it is newer', async () => {
  const store = memoryStore({ settings: { minutes: 5, updatedAt: 5 } as Snapshot['settings'] });
  await store.applyRemote(remote({ settings: { minutes: 20, updatedAt: 3 } as Snapshot['settings'] }));
  expect((await store.settings()).minutes).toBe(5);
  await store.applyRemote(remote({ settings: { minutes: 20, updatedAt: 9 } as Snapshot['settings'] }));
  expect((await store.settings()).minutes).toBe(20);
});
