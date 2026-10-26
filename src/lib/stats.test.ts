import { expect, test } from 'vitest';
import { State } from 'ts-fsrs';
import verbsJson from '../data/verbs.json';
import { endOfTomorrow, hardestVerbs, promptAccuracy, recall, reviewsDueBy, streak, unitProgress, weakSpots } from './stats';
import { newCard } from './scheduler';
import { UNITS } from '../content/units';
import type { CardState, Prompt, ReviewLog, Tense, Verb } from './types';

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

const conj = (lemma: string, tense: Tense, prompts: Partial<Record<Prompt, [number, number]>>): CardState =>
  ({ ...newCard(`c:${lemma}:${tense}`, 0), prompts } as CardState);

test('promptAccuracy sums across verbs', () => {
  const acc = promptAccuracy([
    conj('falar', 'perf', { nós: [1, 4] }),
    conj('comer', 'perf', { nós: [2, 4] }),
    { ...newCard('s:12', 0), prompts: { nós: [9, 9] } } as CardState,
  ]);
  expect(acc.get('perf.nós')).toEqual({ ok: 3, total: 8 });
  expect(acc.has('s:12')).toBe(false);
});

test('weakSpots skips small samples and sorts', () => {
  const acc = new Map([
    ['perf.nós', { ok: 1, total: 3 }],
    ['imperf.eu', { ok: 5, total: 10 }],
    ['pres.você', { ok: 2, total: 10 }],
  ]);
  expect(weakSpots(acc)).toEqual([
    { tense: 'pres', prompt: 'você', pct: 20 },
    { tense: 'imperf', prompt: 'eu', pct: 50 },
  ]);
});

test('hardestVerbs sums each lemma and skips small samples', () => {
  const cards = [
    conj('falar', 'perf', { nós: [1, 4] }),
    conj('falar', 'pres', { eu: [0, 2] }),
    conj('comer', 'perf', { nós: [4, 5] }),
    conj('ver', 'pres', { eu: [0, 2] }),
  ];
  expect(hardestVerbs(cards)).toEqual([{ lemma: 'falar', pct: 17 }, { lemma: 'comer', pct: 80 }]);
});

test('recall is the share of 30-day ratings of 2 or more', () => {
  const day = 864e5;
  const now = Date.now();
  const log = (age: number, rating: 1 | 2 | 3 | 4): ReviewLog => ({ id: String(age), cardId: 'c:fazer:pres', at: now - age, rating, device: 'd' });
  expect(recall([log(1 * day, 3), log(2 * day, 1), log(3 * day, 2), log(4 * day, 3), log(40 * day, 1)], now)).toBe(0.75);
  expect(recall([log(40 * day, 3)], now)).toBeUndefined();
  expect(recall([], now)).toBeUndefined();
});
