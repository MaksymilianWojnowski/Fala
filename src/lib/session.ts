import { check, type CheckResult } from './check';
import { PROMPT_SLOT } from './names';
import { newCard, rate } from './scheduler';
import type { CardState, Item, Rating, Sentence, Slot, Store, Tense, Verb } from './types';

export interface SessionState {
  items: Item[];
  index: number;
  phase: 'answer' | 'feedback' | 'done';
  startedAt: number;
  minutes: number;
  mode: 'review' | 'test';
  last?: { input: string; check: CheckResult; rating: Rating; expected: string };
  counts: { correct: number; almost: number; missed: number };
  missed: Item[];
}

export type SessionAction =
  | { type: 'submit'; input: string; now: number }
  | { type: 'grade'; got: boolean; now: number }
  | { type: 'continue'; now: number }
  | { type: 'flag'; now: number };

export interface SessionContext {
  verbs: Map<string, Verb>;
  strictAccents: boolean;
}

const MINUTE = 60e3;
const DAY = 864e5;

export function startSession(items: Item[], now: number, minutes: number, mode: 'review' | 'test' = 'review'): SessionState {
  return {
    items, index: 0, phase: items.length ? 'answer' : 'done', startedAt: now, minutes, mode,
    counts: { correct: 0, almost: 0, missed: 0 }, missed: [],
  };
}

// Correct = Good, accent = Hard (Again in strict mode), wrong = Again.
export function ratingFor(c: CheckResult, strict: boolean): Rating {
  if (c.result === 'correct') return 3;
  if (c.result === 'accent') return strict ? 1 : 2;
  return 1;
}

// Got it = Good, Missed = Again. Translate has no typed check, so the learner grades it.
export function gradeRating(got: boolean): Rating {
  return got ? 3 : 1;
}

// The sentence with its gap cut out; the gap itself is rendered by the screen.
export function gapParts(s: Sentence): { before: string; after: string } {
  return { before: s.pt.slice(0, s.gap.start), after: s.pt.slice(s.gap.end) };
}

// The verb cell an item is asking for, if any.
function cell(item: Item): { lemma: string; tense: Tense; slot: Slot } | undefined {
  if (item.kind === 'conjugate') return { lemma: item.lemma, tense: item.tense, slot: PROMPT_SLOT[item.prompt] };
  if (item.kind === 'gap') return item.sentence.gap;
  return undefined;
}

export function expectedFor(item: Item, verbs: Map<string, Verb>): string {
  const c = cell(item);
  if (!c) return item.kind === 'translate' ? item.sentence.pt : '';
  return verbs.get(c.lemma)!.forms[c.tense][c.slot]!;
}

export function untilText(ms: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  const min = Math.max(1, Math.round(ms / MINUTE));
  if (min < 60) return plural(min, 'minute');
  const h = Math.round(ms / 36e5);
  if (h < 24) return plural(h, 'hour');
  return plural(Math.round(ms / DAY), 'day');
}

export function reduce(s: SessionState, a: SessionAction, ctx: SessionContext): SessionState {
  switch (a.type) {
    case 'submit': {
      if (s.phase !== 'answer') return s;
      const item = s.items[s.index];
      const c = cell(item);
      const expected = expectedFor(item, ctx.verbs);
      const result = check(a.input, expected, c && ctx.verbs.get(c.lemma), c?.tense, c?.slot);
      const rating = ratingFor(result, ctx.strictAccents);
      const counts = { ...s.counts };
      if (rating === 1) counts.missed++;
      else if (result.result === 'accent') counts.almost++;
      else counts.correct++;
      return {
        ...s,
        phase: 'feedback',
        counts,
        missed: rating === 1 ? [...s.missed, item] : s.missed,
        last: { input: a.input, check: result, rating, expected },
      };
    }
    case 'continue': {
      if (s.phase !== 'feedback') return s;
      return advance(s, a.now);
    }
    case 'grade': {
      if (s.phase !== 'answer') return s;
      const item = s.items[s.index];
      const counts = { ...s.counts };
      if (a.got) counts.correct++;
      else counts.missed++;
      return advance({ ...s, counts, missed: a.got ? s.missed : [...s.missed, item] }, a.now);
    }
    // Flagging only skips the card; it never counts as an answer. It works from the feedback footer too.
    case 'flag':
      if (s.phase === 'done') return s;
      return advance(s, a.now);
  }
}

// Moves to the next item, or ends the run at the time limit (review mode only).
function advance(s: SessionState, now: number): SessionState {
  const index = s.index + 1;
  const timeUp = s.mode === 'review' && now - s.startedAt >= s.minutes * MINUTE;
  if (index >= s.items.length || timeUp) return { ...s, phase: 'done', last: undefined };
  return { ...s, index, phase: 'answer', last: undefined };
}

// Saves one answer at once, so a closed tab keeps what was answered.
export async function commitAnswer(store: Store, item: Item, rating: Rating, input: string, now: number): Promise<CardState> {
  const id = item.cardId;
  const card = (await store.cards()).get(id) ?? newCard(id, now);
  const next = rate(card, rating, now, item.kind === 'conjugate' ? item.prompt : undefined);
  await store.putCard(next);
  await store.addLog({ id: crypto.randomUUID(), cardId: id, at: now, rating, answer: input, device: await store.device() });
  return next;
}

// Flagged cards are suspended, so they never come back in a session.
export async function suspendCard(store: Store, cardId: string, now: number): Promise<CardState> {
  const card = (await store.cards()).get(cardId) ?? newCard(cardId, now);
  const next = { ...card, suspended: true, updatedAt: now };
  await store.putCard(next);
  return next;
}
