import { expect, test } from 'vitest';
import { check, diffSpan } from './check';
import type { Verb } from './types';

// Partial fixture: only pres and perf are filled, so cast the literal.
const fazer = {
  lemma: 'fazer',
  en: 'to do',
  rank: 1,
  participle: 'feito',
  gerund: 'fazendo',
  forms: {
    pres: { eu: 'faço', tu: 'fazes', ele: 'faz', nos: 'fazemos', eles: 'fazem' },
    perf: { eu: 'fiz', tu: 'fizeste', ele: 'fez', nos: 'fizemos', eles: 'fizeram' },
  },
  irregular: ['perf.eu', 'participle'],
} as Verb;

test('exact match is correct, ignoring case, whitespace and trailing punctuation', () => {
  expect(check('fizemos', 'fizemos')).toEqual({ result: 'correct' });
  expect(check('Fizemos ', 'fizemos')).toEqual({ result: 'correct' });
  expect(check('fizemos.', 'fizemos')).toEqual({ result: 'correct' });
  expect(check('tinha  feito', 'tinha feito')).toEqual({ result: 'correct' });
});

test('missing accents are reported as accent', () => {
  expect(check('brincavamos', 'brincávamos')).toEqual({ result: 'accent' });
});

test('any alternative is accepted', () => {
  expect(check('pagado', 'pago|pagado')).toEqual({ result: 'correct' });
});

test('wrong form in the same tense gets a note about the other slot', () => {
  expect(check('fazemos', 'fizemos', fazer, 'perf', 'nos')).toEqual({ result: 'wrong', note: 'fazemos is presente' });
  expect(check('fizeram', 'fizemos', fazer, 'perf', 'nos')).toEqual({ result: 'wrong', note: 'fizeram is the vocês form' });
});

test('unknown form is wrong with no note', () => {
  expect(check('xyz', 'fizemos', fazer, 'perf', 'nos')).toEqual({ result: 'wrong' });
});

test('diffSpan returns the differing part of expected', () => {
  expect(diffSpan('brincávamos', 'brincavamos')).toEqual([5, 6]);
  expect(diffSpan('fizemos', 'fazemos')).toEqual([1, 2]);
});
