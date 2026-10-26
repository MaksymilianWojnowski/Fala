import { expect, test } from 'vitest';
import verbsJson from '../data/verbs.json';
import { exampleForms, findVerb } from './verbs';
import type { Verb } from './types';

const verbs = verbsJson as unknown as Verb[];

test('findVerb matches a form, ignoring case and accents', () => {
  expect(findVerb('fiz', verbs)?.lemma).toBe('fazer');
  expect(findVerb('Fazer', verbs)?.lemma).toBe('fazer');
  expect(findVerb('pago', verbs)?.lemma).toBe('pagar');
  expect(findVerb('xyzzy', verbs)).toBeUndefined();
});

test('findVerb falls back to a lemma prefix, and blank input finds nothing', () => {
  expect(findVerb('fal', verbs)?.lemma).toBe('falar');
  expect(findVerb('   ', verbs)).toBeUndefined();
});

test('exampleForms returns the first two forms of the most common verbs', () => {
  expect(exampleForms(verbs, 'perf', 'eu')).toEqual(['fui', 'fiz']);
});
