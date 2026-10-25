import { State } from 'ts-fsrs';
import { dayKey, unitVerbs } from './scheduler';
import type { CardState, ReviewLog, Unit, UnitState, Verb } from './types';

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
