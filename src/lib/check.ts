import { PROMPT_PRONOUNS, PROMPT_SLOT, REQUIRED_SLOTS, TENSE_NAMES, TENSES, alternates } from './names';
import type { Prompt, Slot, Tense, Verb } from './types';

export type CheckResult = { result: 'correct' | 'accent' | 'wrong'; note?: string };

export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/, '')
    .trim();
}

export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

// First pronoun shown for a slot, e.g. eles -> vocês, ele -> você, nos -> nós.
function slotPronoun(slot: Slot): string {
  const prompt = (Object.keys(PROMPT_SLOT) as Prompt[]).find((p) => PROMPT_SLOT[p] === slot)!;
  return PROMPT_PRONOUNS[prompt][0];
}

function matches(form: string | undefined, input: string): boolean {
  return form !== undefined && alternates(form).some((alt) => normalize(alt) === input);
}

export function check(input: string, expected: string, verb?: Verb, tense?: Tense, slot?: Slot): CheckResult {
  const typed = normalize(input);
  const forms = alternates(expected).map(normalize);

  if (forms.includes(typed)) return { result: 'correct' };
  const bare = stripDiacritics(typed);
  if (forms.some((f) => stripDiacritics(f) === bare)) return { result: 'accent' };

  if (verb && tense && slot) {
    const otherSlot = REQUIRED_SLOTS[tense].find((s) => s !== slot && matches(verb.forms[tense]?.[s], typed));
    if (otherSlot) return { result: 'wrong', note: `${typed} is the ${slotPronoun(otherSlot)} form` };

    const otherTense = TENSES.find((t) => t !== tense && matches(verb.forms[t]?.[slot], typed));
    if (otherTense) return { result: 'wrong', note: `${typed} is ${TENSE_NAMES[otherTense].toLowerCase()}` };
  }
  return { result: 'wrong' };
}

// Span of the displayed form (first alternative) outside its common prefix and suffix with the normalized input.
export function diffSpan(expected: string, input: string): [start: number, end: number] {
  const shown = alternates(expected)[0].toLowerCase();
  const typed = normalize(input);
  const max = Math.min(shown.length, typed.length);
  let start = 0;
  while (start < max && shown[start] === typed[start]) start++;
  let tail = 0;
  while (tail < max - start && shown[shown.length - 1 - tail] === typed[typed.length - 1 - tail]) tail++;
  return [start, shown.length - tail];
}
