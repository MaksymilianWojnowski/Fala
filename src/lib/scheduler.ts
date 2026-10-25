import { createEmptyCard, fsrs, generatorParameters, type Grade } from 'ts-fsrs';
import { UNITS } from '../content/units';
import { PROMPT_PRONOUNS, promptsFor } from './names';
import type { CardState, Item, Prompt, Rating, Sentence, Settings, Tense, Unit, UnitState, Verb } from './types';

export const f = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

// "Today" rolls over at 04:00 wall-clock time; subtracting 4h of absolute time is off by one hour on DST days.
export function dayKey(t: Date | number): string {
  const d = new Date(+t);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function newCard(id: string, now: number): CardState {
  return { id, fsrs: createEmptyCard(new Date(now)), passes: 0, introduced: dayKey(now), updatedAt: now };
}

export function rate(card: CardState, rating: Rating, now: number, prompt?: Prompt): CardState {
  const ok = rating >= 2;
  const next: CardState = {
    ...card,
    fsrs: f.next(card.fsrs, now, rating as Grade).card,
    passes: card.passes + (ok ? 1 : 0),
    updatedAt: now,
  };
  if (prompt) {
    const [okN, total] = card.prompts?.[prompt] ?? [0, 0];
    next.prompts = { ...card.prompts, [prompt]: [okN + (ok ? 1 : 0), total + 1] };
  }
  return next;
}

// Misses weigh more: 1 - accuracy, plus a floor so every prompt stays reachable. No data -> 1.2.
export function pickPrompt(card: CardState | undefined, available: Prompt[], rng: () => number): Prompt {
  const weights = available.map((p) => {
    const d = card?.prompts?.[p];
    return d && d[1] > 0 ? 1 - d[0] / d[1] + 0.2 : 1.2;
  });
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < available.length; i++) {
    r -= weights[i];
    if (r < 0) return available[i];
  }
  return available[available.length - 1];
}

export function pronounFor(prompt: Prompt, rng: () => number): string {
  const options = PROMPT_PRONOUNS[prompt];
  return options[Math.floor(rng() * options.length)];
}

const DAY = 864e5;

export interface BuildInput {
  cards: Map<string, CardState>;
  units: Map<string, UnitState>;
  settings: Settings;
  now: number;
  verbs: Verb[];
  sentences: Sentence[];
  rng: () => number;
  hasVoice: boolean;
}

export function unitVerbs(unit: Unit, verbs: Verb[]): Verb[] {
  const sorted = [...verbs].sort((a, b) => a.rank - b.rank);
  if (!unit.filter) return sorted;
  return sorted.filter((v) => {
    const hit = unit.tenses.some((t) => v.irregular.some((c) => c.startsWith(`${t}.`)));
    return unit.filter === 'irregular' ? hit : !hit;
  });
}

export function hintLevel(stability: number, hasVoice: boolean): 'tense' | 'context' | 'audio' {
  if (stability < 3) return 'tense';
  if (stability < 21 || !hasVoice) return 'context';
  return 'audio';
}

const isActive = (u: Unit, i: BuildInput) => {
  const s = i.units.get(u.id)?.status;
  return s === 'learning' || s === 'known';
};
const activeUnits = (i: BuildInput) => UNITS.filter((u) => isActive(u, i));
const isDue = (c: CardState, now: number) => !c.suspended && +c.fsrs.due <= now;

export function newCandidates(i: BuildInput): string[] {
  const fresh = (id: string) => !i.cards.has(id);
  const passes = (id: string) => i.cards.get(id)?.passes ?? 0;
  const conj = [...new Set(activeUnits(i).flatMap((u) =>
    unitVerbs(u, i.verbs).flatMap((v) => u.tenses.map((t) => `c:${v.lemma}:${t}`))))].filter(fresh);
  const gap = i.sentences.filter((s) => passes(`c:${s.gap.lemma}:${s.gap.tense}`) >= 1)
    .map((s) => `s:${s.id}`).filter(fresh);
  const translate = i.sentences.filter((s) => passes(`s:${s.id}`) >= 2)
    .map((s) => `t:${s.id}`).filter(fresh);
  const lists = [conj, gap, translate];
  const out: string[] = [];
  const longest = Math.max(...lists.map((l) => l.length));
  for (let k = 0; k < longest; k++) for (const l of lists) if (k < l.length) out.push(l[k]);
  return out;
}

function conjItem(cardId: string, card: CardState | undefined, lemma: string, tense: Tense, i: BuildInput): Item {
  const prompt = pickPrompt(card, promptsFor(tense, i.settings.tu), i.rng);
  return { kind: 'conjugate', cardId, lemma, tense, prompt, pronoun: pronounFor(prompt, i.rng) };
}

// Returns undefined for s:/t: ids whose sentence is missing.
function toItem(id: string, i: BuildInput): Item | undefined {
  const [kind, key, tense] = id.split(':');
  const card = i.cards.get(id);
  if (kind === 'c') return conjItem(id, card, key, tense as Tense, i);
  const sentence = i.sentences.find((s) => s.id === Number(key));
  if (!sentence) return undefined;
  if (kind === 's') return { kind: 'gap', cardId: id, sentence, hint: hintLevel(card?.fsrs.stability ?? 0, i.hasVoice) };
  return { kind: 'translate', cardId: id, sentence };
}

const toItems = (ids: string[], i: BuildInput): Item[] =>
  ids.map((id) => toItem(id, i)).filter((x): x is Item => x !== undefined);

export function buildSession(i: BuildInput): Item[] {
  const introduced = [...i.cards.values()].filter((c) => c.introduced === dayKey(i.now)).length;
  const due = [...i.cards.values()].filter((c) => isDue(c, i.now))
    .sort((a, b) => +a.fsrs.due - +b.fsrs.due).map((c) => c.id);
  const fresh = newCandidates(i).slice(0, Math.max(0, i.settings.newPerDay - introduced));
  return toItems([...due, ...fresh].slice(0, i.settings.minutes * 4), i);
}

export function verbSession(lemma: string, i: BuildInput): Item[] {
  const tenses = [...new Set(activeUnits(i).flatMap((u) => u.tenses))];
  const ids = tenses.map((t) => `c:${lemma}:${t}`).filter((id) => {
    const c = i.cards.get(id);
    return !c || isDue(c, i.now);
  });
  return toItems(ids.slice(0, 10), i);
}

export function placementItems(unit: Unit, verbs: Verb[], settings: Settings, rng: () => number): Item[] {
  const pool = unitVerbs(unit, verbs).slice(0, 30);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rng() * xs.length)];
  return Array.from({ length: 6 }, () => {
    const lemma = pick(pool).lemma;
    const tense = pick(unit.tenses);
    const prompt = pickPrompt(undefined, promptsFor(tense, settings.tu), rng);
    return { kind: 'conjugate' as const, cardId: `c:${lemma}:${tense}`, lemma, tense, prompt, pronoun: pronounFor(prompt, rng) };
  });
}

export function applyPlacement(unit: Unit, correct: number, i: BuildInput): { unit?: UnitState; cards: CardState[] } {
  if (correct < 5) return { cards: [] };
  const pool = unitVerbs(unit, i.verbs).slice(0, 30);
  const cards = unit.tenses.flatMap((t) => pool.map((v) => `c:${v.lemma}:${t}`))
    .filter((id) => !i.cards.has(id))
    .map((id) => {
      const c = rate(newCard(id, i.now), 3, i.now);
      // Spread first reviews over two weeks.
      return { ...c, fsrs: { ...c.fsrs, due: new Date(i.now + (1 + Math.floor(i.rng() * 14)) * DAY) } };
    });
  return { unit: { id: unit.id, status: 'known', updatedAt: i.now }, cards };
}
