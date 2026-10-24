import { expect, test } from 'vitest';
import verbs from './verbs.json';
import { REQUIRED_SLOTS, TENSES, alternates } from '../lib/names';

test('every verb has every required cell', () => {
  expect(verbs.length).toBeGreaterThanOrEqual(150);
  for (const v of verbs) for (const t of TENSES) for (const s of REQUIRED_SLOTS[t])
    expect((v.forms as any)[t]?.[s], `${v.lemma} ${t} ${s}`).toBeTruthy();
});

test('ranks are 1..n and unique', () => {
  expect(verbs.map(v => v.rank)).toEqual(verbs.map((_, i) => i + 1));
});

test('double participles are kept', () => {
  expect(alternates(verbs.find(v => v.lemma === 'pagar')!.participle)).toContain('pago');
});
