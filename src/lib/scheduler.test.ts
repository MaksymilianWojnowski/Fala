import { expect, test } from 'vitest';
import type { CardState } from './types';
import { dayKey, newCard, pickPrompt, rate } from './scheduler';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('day rolls over at 04:00', () => {
  expect(dayKey(new Date(2026, 9, 25, 3, 59))).toBe('2026-10-24');
  expect(dayKey(new Date(2026, 9, 25, 4, 0))).toBe('2026-10-25');
});

test('rate', () => {
  const now = Date.UTC(2026, 9, 24, 12);
  const good = rate(newCard('c:falar:pres', now), 3, now, 'nós');
  expect([good.passes, good.fsrs.reps, good.prompts?.['nós']]).toEqual([1, 1, [1, 1]]);
  expect(+good.fsrs.due).toBeGreaterThan(now);
  expect(rate(newCard('x', now), 1, now, 'nós').passes).toBe(0);
});

test('pickPrompt favours misses', () => {
  const card = { ...newCard('x', 0), prompts: { 'nós': [0, 10], eu: [10, 10] } } as CardState;
  const rng = mulberry32(1);
  let n = 0;
  for (let i = 0; i < 1000; i++) if (pickPrompt(card, ['eu', 'nós'], rng) === 'nós') n++;
  expect(n).toBeGreaterThan(800);
});

test('pickPrompt without data reaches every prompt', () => {
  const rng = mulberry32(2);
  const seen = new Set<string>();
  for (let i = 0; i < 100; i++) seen.add(pickPrompt(undefined, ['eu', 'você', 'nós'], rng));
  expect(seen.size).toBe(3);
});
