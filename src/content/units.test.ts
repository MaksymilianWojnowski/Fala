import { expect, test } from 'vitest';
import { TENSES } from '../lib/names';
import { UNITS, unitForTense } from './units';

test('unitForTense returns the first unit that teaches the tense', () => {
  expect(unitForTense('pres').id).toBe('pres_reg');
  expect(unitForTense('imperf').id).toBe('imperf');
  expect(unitForTense('subj_pres').id).toBe('subj_pres');
});

test('every tense belongs to a unit', () => {
  for (const t of TENSES) expect(UNITS.some((u) => u.tenses.includes(t)), t).toBe(true);
});
