import { State } from 'ts-fsrs';
import { dayKey, unitVerbs } from './scheduler';
import type { CardState, Prompt, ReviewLog, Tense, Unit, UnitState, Verb } from './types';

function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12));
}

// Consecutive days with a log, counted back from today (or yesterday if today has none yet).
export function streak(logs: ReviewLog[], now: number): number {
  const days = new Set(logs.map((l) => dayKey(l.at)));
  let key = dayKey(now);
  if (!days.has(key)) key = dayBefore(key);
  let n = 0;
  while (days.has(key)) {
    n++;
    key = dayBefore(key);
  }
  return n;
}

// Second 04:00 local rollover after now, the end of "tomorrow" in dayKey terms.
export function endOfTomorrow(now: number): number {
  const r = new Date(now);
  r.setHours(4, 0, 0, 0);
  if (+r <= now) r.setDate(r.getDate() + 1);
  r.setDate(r.getDate() + 1);
  return +r;
}

export function reviewsDueBy(cards: Iterable<CardState>, until: number): number {
  let n = 0;
  for (const c of cards) if (!c.suspended && +c.fsrs.due <= until) n++;
  return n;
}

export function unitProgress(unit: Unit, cards: Map<string, CardState>, verbs: Verb[]): { learned: number; total: number } {
  const ids = unitVerbs(unit, verbs).flatMap((v) => unit.tenses.map((t) => `c:${v.lemma}:${t}`));
  const learned = ids.filter((id) => cards.get(id)?.fsrs.state === State.Review).length;
  return { learned, total: ids.length };
}

// The learning unit started most recently ("Continue learning" and the Path highlight).
export function currentUnit(units: Map<string, UnitState>): UnitState | undefined {
  let best: UnitState | undefined;
  for (const u of units.values()) if (u.status === 'learning' && (!best || u.updatedAt > best.updatedAt)) best = u;
  return best;
}

const DAY = 864e5;

export type Accuracy = Map<string, { ok: number; total: number }>;

// Conjugation attempts summed over every verb, keyed `${tense}.${prompt}`. Gap and translate cards have no prompts.
export function promptAccuracy(cards: Iterable<CardState>): Accuracy {
  const out: Accuracy = new Map();
  for (const c of cards) {
    if (!c.id.startsWith('c:') || !c.prompts) continue;
    const tense = c.id.split(':')[2];
    for (const [prompt, d] of Object.entries(c.prompts) as [string, [number, number] | undefined][]) {
      if (!d) continue;
      const key = `${tense}.${prompt}`;
      const cur = out.get(key) ?? { ok: 0, total: 0 };
      out.set(key, { ok: cur.ok + d[0], total: cur.total + d[1] });
    }
  }
  return out;
}

// Lowest accuracy first; cells with fewer than minTotal attempts are too noisy to rank.
export function weakSpots(acc: Accuracy, minTotal = 5, n = 3): { tense: Tense; prompt: Prompt; pct: number }[] {
  return [...acc]
    .filter(([, d]) => d.total >= minTotal)
    .map(([key, d]) => {
      const i = key.indexOf('.');
      return { tense: key.slice(0, i) as Tense, prompt: key.slice(i + 1) as Prompt, pct: Math.round((100 * d.ok) / d.total) };
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n);
}

export function hardestVerbs(cards: Iterable<CardState>, n = 4, minTotal = 5): { lemma: string; pct: number }[] {
  const per = new Map<string, { ok: number; total: number }>();
  for (const c of cards) {
    if (!c.id.startsWith('c:') || !c.prompts) continue;
    const lemma = c.id.split(':')[1];
    for (const d of Object.values(c.prompts) as ([number, number] | undefined)[]) {
      if (!d) continue;
      const cur = per.get(lemma) ?? { ok: 0, total: 0 };
      per.set(lemma, { ok: cur.ok + d[0], total: cur.total + d[1] });
    }
  }
  return [...per]
    .filter(([, d]) => d.total >= minTotal)
    .map(([lemma, d]) => ({ lemma, pct: Math.round((100 * d.ok) / d.total) }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n);
}

// Share of ratings of 2 (Hard) or better over the last `days`; undefined when nothing was reviewed in that window.
export function recall(logs: ReviewLog[], now: number, days = 30): number | undefined {
  const since = now - days * DAY;
  const window = logs.filter((l) => l.at >= since);
  if (!window.length) return undefined;
  return window.filter((l) => l.rating >= 2).length / window.length;
}
