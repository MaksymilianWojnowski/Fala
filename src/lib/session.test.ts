import { expect, test } from 'vitest';
import verbsJson from '../data/verbs.json';
import { memoryStore } from './store';
import { commitAnswer, expectedFor, ratingFor, reduce, startSession, untilText } from './session';
import type { Item, Verb } from './types';

const verbs = new Map((verbsJson as unknown as Verb[]).map((v) => [v.lemma, v]));
const ctx = { verbs, strictAccents: false };
const NOW = Date.UTC(2026, 9, 24, 12);

const fazerNos: Item = { kind: 'conjugate', cardId: 'c:fazer:perf', lemma: 'fazer', tense: 'perf', prompt: 'nós', pronoun: 'nós' };

test('ratingFor', () => {
  expect([ratingFor({ result: 'correct' }, false), ratingFor({ result: 'accent' }, false),
    ratingFor({ result: 'accent' }, true), ratingFor({ result: 'wrong' }, false)]).toEqual([3, 2, 1, 1]);
});

test('expectedFor uses the asked prompt slot', () => {
  expect(expectedFor(fazerNos, verbs)).toBe('fizemos');
});

test('wrong answer goes to feedback with the expected form', () => {
  const s = reduce(startSession([fazerNos], 0, 10), { type: 'submit', input: 'fazemos', now: 1 }, ctx);
  expect([s.phase, s.counts.missed, s.last?.expected, s.missed.length]).toEqual(['feedback', 1, 'fizemos', 1]);
});

test('continue advances to the next item', () => {
  let s = startSession([fazerNos, fazerNos], 0, 10);
  s = reduce(s, { type: 'submit', input: 'fizemos', now: 1 }, ctx);
  s = reduce(s, { type: 'continue', now: 2 }, ctx);
  expect([s.phase, s.index]).toEqual(['answer', 1]);
});

test('time limit ends at a card boundary', () => {
  let s = startSession([fazerNos, fazerNos], 0, 10);
  s = reduce(s, { type: 'submit', input: 'fizemos', now: 1 }, ctx);
  s = reduce(s, { type: 'continue', now: 10 * 60000 }, ctx);
  expect(s.phase).toBe('done');
});

test('every answer is saved immediately', async () => {
  const store = memoryStore();
  await commitAnswer(store, fazerNos, 1, 'fazemos', NOW);
  await commitAnswer(store, fazerNos, 3, 'fizemos', NOW + 60000);
  expect((await store.cards()).get('c:fazer:perf')?.fsrs.reps).toBe(2);
  expect((await store.logs()).length).toBe(2);
});

test('untilText', () => {
  expect([untilText(30e3), untilText(10 * 60e3), untilText(3 * 3600e3), untilText(2 * 864e5)])
    .toEqual(['1 minute', '10 minutes', '3 hours', '2 days']);
});
