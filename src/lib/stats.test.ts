import { expect, test } from 'vitest';
import { State } from 'ts-fsrs';
import verbsJson from '../data/verbs.json';
import { endOfTomorrow, reviewsDueBy, streak, unitProgress } from './stats';
import { newCard } from './scheduler';
import { UNITS } from '../content/units';
import type { CardState, ReviewLog, Verb } from './types';

const log = (d: Date): ReviewLog => ({ id: String(+d), cardId: 'c:fazer:pres', at: +d, rating: 3, device: 'd' });

test('streak counts 00:30 as the previous day', () => {
  const logs = [log(new Date(2026, 9, 24, 20)), log(new Date(2026, 9, 23, 9))];
  expect(streak(logs, +new Date(2026, 9, 25, 0, 30))).toBe(2);
  expect(streak(logs, +new Date(2026, 9, 27, 12))).toBe(0);
});

test('endOfTomorrow is the second 04:00 rollover after now', () => {
  expect(endOfTomorrow(+new Date(2026, 9, 24, 12))).toBe(+new Date(2026, 9, 26, 4));
  expect(endOfTomorrow(+new Date(2026, 9, 24, 2))).toBe(+new Date(2026, 9, 25, 4));
});

test('reviewsDueBy skips suspended cards', () => {
  const due = { ...newCard('a', 0), suspended: false } as CardState;
  const off = { ...newCard('b', 0), suspended: true } as CardState;
  expect(reviewsDueBy([due, off], Date.now() + 864e5)).toBe(1);
});

test('unitProgress counts Review-state conjugation cards', () => {
  const verbs = verbsJson as unknown as Verb[];
  const pres = UNITS.find((u) => u.id === 'pres_irr')!;
  const card = { ...newCard('c:ser:pres', 0), fsrs: { ...newCard('x', 0).fsrs, state: State.Review } } as CardState;
  const p = unitProgress(pres, new Map([[card.id, card]]), verbs);
  expect(p.learned).toBe(1);
  expect(p.total).toBeGreaterThan(1);
});
