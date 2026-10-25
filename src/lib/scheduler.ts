import { createEmptyCard, fsrs, generatorParameters, type Grade } from 'ts-fsrs';
import { PROMPT_PRONOUNS } from './names';
import type { CardState, Prompt, Rating } from './types';

export const f = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

// "Today" rolls over at 04:00 local time, so shift back 4h before taking the date.
export function dayKey(t: Date | number): string {
  const d = new Date(+t - 4 * 3600_000);
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
