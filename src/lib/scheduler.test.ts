import { expect, test } from 'vitest';
import type { CardState, Sentence, Settings, UnitState, Verb } from './types';
import {
  applyPlacement, buildSession, dayKey, hintLevel, newCandidates, newCard, pickPrompt, rate, unitVerbs, verbSession,
  type BuildInput,
} from './scheduler';
import { DEFAULT_SETTINGS } from './store';
import { UNITS } from '../content/units';
import verbsJson from '../data/verbs.json';

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

// ---- Task 7: units, session builder, unlocks, placement ----

const NOW = Date.UTC(2026, 9, 24, 12);
const DAY = 864e5;
const VERBS = (verbsJson as Verb[]).slice(0, 40);
const SID = 1;
const SENT: Sentence = {
  id: SID, pt: 'Ontem eu comi feijoada.', en: 'Yesterday I ate feijoada.', author: 'test',
  gap: { start: 9, end: 13, lemma: 'comer', tense: 'perf', slot: 'eu' },
};

// Cards default to introduced 10 days ago and due in 30 days, so they are neither due nor counted as today's new cards.
function card(id: string, o: Partial<CardState> = {}): CardState {
  const base = newCard(id, NOW - 10 * DAY);
  return { ...base, fsrs: { ...base.fsrs, due: new Date(NOW + 30 * DAY) }, ...o };
}

function input(units: Record<string, UnitState['status']>, overrides: Record<string, Partial<CardState>> = {}, extra: Partial<BuildInput> = {}): BuildInput {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  return {
    cards: new Map(Object.entries(overrides).map(([id, o]) => [id, card(id, o)])),
    units: new Map(Object.entries(units).map(([id, status]) => [id, { id, status, updatedAt: NOW }])),
    settings,
    now: NOW,
    verbs: VERBS,
    sentences: [SENT],
    rng: mulberry32(7),
    hasVoice: false,
    ...extra,
  };
}

const unit = (id: string) => UNITS.find((u) => u.id === id)!;

test('regular and irregular filters split by unit tenses, in rank order', () => {
  const all = (verbsJson as Verb[]);
  const reg = unitVerbs(unit('pres_reg'), all).map((v) => v.lemma);
  const irr = unitVerbs(unit('pres_irr'), all).map((v) => v.lemma);
  expect(reg).not.toContain('ser');
  expect(reg).toContain('comer');
  expect(irr).toContain('ser');
  expect(irr).not.toContain('comer');
  expect(reg.length + irr.length).toBe(all.length);
  expect(unitVerbs(unit('perf'), all).length).toBe(all.length);
});

test('nothing active → empty session', () => expect(buildSession(input({}))).toEqual([]));

test('due first, oldest first', () => {
  const due = (ms: number) => ({ fsrs: { ...newCard('x', NOW).fsrs, due: new Date(NOW + ms) } });
  const i = input({ pres_reg: 'learning' }, {
    'c:ter:pres': due(-1 * DAY),
    'c:ser:pres': due(-2 * DAY),
    'c:falar:pres': due(1 * DAY),
  });
  const ids = buildSession(i).map((x) => x.cardId);
  expect(ids.slice(0, 2)).toEqual(['c:ser:pres', 'c:ter:pres']);
  expect(ids).not.toContain('c:falar:pres');
});

test('new cap counts today’s introductions', () => {
  const today = dayKey(NOW);
  const taken = Object.fromEntries(VERBS.slice(0, 8).map((v) => [`c:${v.lemma}:perf`, { introduced: today }]));
  const i = input({ perf: 'learning' }, taken);
  expect(buildSession(i).length).toBe(2);
});

test('gap unlocks after one passing conj review', () => {
  expect(newCandidates(input({ perf: 'learning' }))).not.toContain(`s:${SID}`);
  expect(newCandidates(input({ perf: 'learning' }, { 'c:comer:perf': { passes: 1 } }))).toContain(`s:${SID}`);
});

test('translate unlocks after two passing gap reviews', () => {
  expect(newCandidates(input({ perf: 'learning' }, { [`s:${SID}`]: { passes: 1 } }))).not.toContain(`t:${SID}`);
  expect(newCandidates(input({ perf: 'learning' }, { [`s:${SID}`]: { passes: 2 } }))).toContain(`t:${SID}`);
});

test('round-robin', () => {
  const i = input({ perf: 'learning' }, { 'c:comer:perf': { passes: 1 } });
  expect(newCandidates(i).slice(0, 2).map((x) => x[0])).toEqual(['c', 's']);
});

test('size cap', () => {
  const i = input({ perf: 'learning' }, {}, { settings: { ...DEFAULT_SETTINGS, minutes: 5, newPerDay: 50 } });
  expect(buildSession(i).length).toBe(20);
});

test('tu off → no tu prompt', () => {
  const items = buildSession(input({ perf: 'learning', pres_reg: 'learning' }));
  expect(items.length).toBeGreaterThan(0);
  expect(items.every((x) => x.kind !== 'conjugate' || x.prompt !== 'tu')).toBe(true);
});

test('imperative never asks eu or a gente', () => {
  const items = buildSession(input({ imp: 'learning' }));
  expect(items.length).toBeGreaterThan(0);
  for (const x of items) {
    expect(x.kind).toBe('conjugate');
    if (x.kind === 'conjugate') expect(['você', 'nós', 'vocês']).toContain(x.prompt);
  }
});

test('placement pass', () => {
  const r = applyPlacement(unit('perf'), 5, input({ perf: 'learning' }));
  expect(r.unit?.status).toBe('known');
  expect(r.cards.length).toBe(30);
  for (const c of r.cards) {
    const d = +c.fsrs.due - NOW;
    expect(d).toBeGreaterThanOrEqual(DAY);
    expect(d).toBeLessThan(15 * DAY);
  }
});

test('placement fail', () => expect(applyPlacement(unit('perf'), 4, input({ perf: 'learning' }))).toEqual({ cards: [] }));

test('verbSession', () => {
  const items = verbSession('fazer', input({ perf: 'learning' }));
  expect(items.length).toBeGreaterThan(0);
  expect(items.length).toBeLessThanOrEqual(10);
  expect(items.every((x) => x.kind === 'conjugate' && x.lemma === 'fazer')).toBe(true);
});

test('hintLevel', () => expect([hintLevel(1, true), hintLevel(5, true), hintLevel(30, true), hintLevel(30, false)])
  .toEqual(['tense', 'context', 'audio', 'context']));
