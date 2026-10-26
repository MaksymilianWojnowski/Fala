import { expect, test } from 'vitest';
import verbsJson from '../data/verbs.json';
import { memoryStore } from './store';
import { commitAnswer, expectedFor, gapParts, gradeRating, ratingFor, reduce, startSession, suspendCard, untilText } from './session';
import type { Item, Sentence, Verb } from './types';

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

test('test mode never times out: placement moves on past the minute limit', () => {
  let s = startSession([fazerNos, fazerNos], 0, 10, 'test');
  s = reduce(s, { type: 'submit', input: 'fizemos', now: 1 }, ctx);
  s = reduce(s, { type: 'continue', now: 60 * 60000 }, ctx);
  expect([s.phase, s.index]).toEqual(['answer', 1]);
});

// ---- Task 13: gap, translate, flag ----

const comiSentence: Sentence = {
  id: 1, pt: 'Ontem eu comi feijoada.', en: 'Yesterday I ate feijoada.', author: 'test',
  gap: { start: 9, end: 13, lemma: 'comer', tense: 'perf', slot: 'eu' },
};
const translateItem: Item = { kind: 'translate', cardId: 't:1', sentence: comiSentence };

test('gapParts splits the sentence around the gap', () => {
  expect(gapParts(comiSentence)).toEqual({ before: 'Ontem eu ', after: ' feijoada.' });
});

test('grade: got counts correct and rates Good; missed counts missed and rates Again', () => {
  const start = startSession([translateItem, translateItem], 0, 10);
  const got = reduce(start, { type: 'grade', got: true, now: 1 }, ctx);
  expect([got.index, got.counts.correct, got.counts.missed, got.missed.length]).toEqual([1, 1, 0, 0]);
  const missed = reduce(start, { type: 'grade', got: false, now: 1 }, ctx);
  expect([missed.index, missed.counts.correct, missed.counts.missed, missed.missed.length]).toEqual([1, 0, 1, 1]);
  expect(gradeRating(true)).toBe(3);
  expect(gradeRating(false)).toBe(1);
});

test('grade on the last item finishes the session', () => {
  const s = reduce(startSession([translateItem], 0, 10), { type: 'grade', got: true, now: 1 }, ctx);
  expect(s.phase).toBe('done');
});

test('flag advances without counting', () => {
  const s = reduce(startSession([translateItem, translateItem], 0, 10), { type: 'flag', now: 1 }, ctx);
  expect([s.index, s.phase, s.counts, s.missed.length]).toEqual([1, 'answer', { correct: 0, almost: 0, missed: 0 }, 0]);
});

test('flag also works from the feedback footer of a gap', () => {
  let s = reduce(startSession([translateItem, translateItem], 0, 10), { type: 'submit', input: 'x', now: 1 }, ctx);
  expect(s.phase).toBe('feedback');
  s = reduce(s, { type: 'flag', now: 2 }, ctx);
  expect([s.index, s.phase, s.counts.missed]).toEqual([1, 'answer', 1]);
});

test('flag suspends the card, creating it when missing', async () => {
  const store = memoryStore();
  await suspendCard(store, 't:1', NOW);
  expect((await store.cards()).get('t:1')?.suspended).toBe(true);
});
