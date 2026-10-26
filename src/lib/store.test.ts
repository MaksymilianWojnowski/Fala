import { expect, test } from 'vitest';
import { memoryStore } from './store';
import type { CardState, ReviewLog, UnitState } from './types';

const card = (id: string, due = 1): CardState => ({ id, fsrs: { due: new Date(due) } as CardState['fsrs'], updatedAt: 1, passes: 0, introduced: '2026-10-24' });
const log = (id: string): ReviewLog => ({ id, cardId: 'c:a', at: 1, rating: 3, device: 'd' });
const unit = (id: string): UnitState => ({ id, status: 'learning', updatedAt: 1 });

test('replace keeps the new data and removes stale keys', async () => {
  const store = memoryStore({ cards: [card('old')], logs: [log('l-old')], units: [unit('u-old')] });
  await store.replace({ cards: [card('new')], logs: [log('l-new')], units: [unit('u-new')], settings: { ...(await store.settings()), minutes: 20 } });
  const snap = await store.snapshot();
  expect(snap.cards.map((c) => c.id)).toEqual(['new']);
  expect(snap.logs.map((l) => l.id)).toEqual(['l-new']);
  expect(snap.units.map((u) => u.id)).toEqual(['u-new']);
  expect(snap.settings.minutes).toBe(20);
});
