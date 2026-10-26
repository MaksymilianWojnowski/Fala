import { expect, test } from 'vitest';
import verbs from './verbs.json';
import sentences from './sentences.json';
import { REQUIRED_SLOTS, TENSES, alternates } from '../lib/names';
import { UNITS } from '../content/units';
import { LEARN } from '../content/learn';
import { CONTRAST } from '../content/contrast';

const byLemma = new Map(verbs.map(v => [v.lemma, v]));

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

test('reviewed forms are pinned', () => {
  expect(alternates(verbs.find(v => v.lemma === 'destruir')!.forms.pres.eles!)).toContain('destroem');
  expect(alternates(verbs.find(v => v.lemma === 'haver')!.forms.pres.nos!)[0]).toBe('havemos');
  expect(alternates(verbs.find(v => v.lemma === 'morrer')!.participle)[0]).toBe('morrido');
});

test('every unit has a lesson', () => {
  for (const u of UNITS) {
    const l = LEARN[u.id];
    expect(l, u.id).toBeDefined();
    expect([l.uses.length, l.examples.length], u.id).toEqual([3, 5]);
    expect(l.why, u.id).toBeTruthy();
    expect(l.signals.length, u.id).toBeLessThanOrEqual(6);
    expect(l.irregulars.length, u.id).toBeLessThanOrEqual(5);
    if (u.id === 'pres_reg') expect(l.irregulars.length).toBe(0);
  }
});

test('lesson irregulars exist in verbs.json', () => {
  for (const l of Object.values(LEARN))
    for (const i of l.irregulars) expect(byLemma.has(i.verb), i.verb).toBe(true);
});

test('contrast sentences match the tables', () => {
  for (const s of CONTRAST) {
    expect(s.id).toBeLessThan(0);
    expect(s.why, String(s.id)).toBeTruthy();
    const cell = (byLemma.get(s.gap.lemma)!.forms as any)[s.gap.tense][s.gap.slot];
    expect(alternates(cell), s.pt).toContain(s.pt.slice(s.gap.start, s.gap.end).toLowerCase());
  }
});

test('single-tense irregular forms match the tense table', () => {
  const SKIP = ['prog', 'fut_ir', 'perf_comp', 'mqp_comp', 'perf_vs_imperf'];
  for (const u of UNITS) {
    if (SKIP.includes(u.id) || u.tenses.length !== 1) continue;
    const tense = u.tenses[0];
    for (const i of LEARN[u.id].irregulars) {
      const forms = i.forms.split(', ');
      const slots = ['eu', 'ele', 'nos', 'eles'].slice(4 - forms.length);
      const cells = slots.map(s => (byLemma.get(i.verb)!.forms as any)[tense][s]);
      expect(forms, `${u.id} ${i.verb}`).toEqual(cells.map(c => alternates(c)[0]));
    }
  }
});

test('contrast counts', () => {
  const count = (tenses: string[]) => CONTRAST.filter(s => tenses.includes(s.gap.tense)).length;
  expect(count(['perf', 'imperf'])).toBeGreaterThanOrEqual(20);
  expect(CONTRAST.filter(s => s.gap.tense === 'subj_pres').length).toBeGreaterThanOrEqual(10);
  expect(CONTRAST.filter(s => s.gap.tense === 'subj_imperf').length).toBeGreaterThanOrEqual(10);
  expect(CONTRAST.filter(s => s.gap.tense === 'subj_fut').length).toBeGreaterThanOrEqual(10);
});

test('every gap matches its table cell', () => {
  for (const s of sentences) {
    expect(s.id).toBeGreaterThan(0);
    expect(s.en).toBeTruthy();
    expect(s.gap.slot).not.toBe('tu');
    const cell = (byLemma.get(s.gap.lemma)!.forms as any)[s.gap.tense][s.gap.slot];
    expect(alternates(cell), s.pt).toContain(s.pt.slice(s.gap.start, s.gap.end).toLowerCase());
  }
});

test('core tenses have enough sentences', () => {
  for (const t of ['pres', 'perf', 'imperf'])
    expect(sentences.filter(s => s.gap.tense === t).length, t).toBeGreaterThanOrEqual(300);
});

test('subjunctive and imperative have enough sentences', () => {
  expect(sentences.filter(s => s.gap.tense === 'subj_pres').length).toBeGreaterThanOrEqual(100);
  expect(sentences.filter(s => s.gap.tense === 'imp').length).toBeGreaterThanOrEqual(50);
});
