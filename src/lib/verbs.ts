import { normalize, stripDiacritics } from './check';
import { PROMPT_SLOT, alternates } from './names';
import type { Prompt, Tense, Verb } from './types';

const bare = (s: string) => stripDiacritics(normalize(s));

// Every spelling of a verb: tense forms, participle and gerund, with alternates split out.
function formsOf(v: Verb): string[] {
  const forms = Object.values(v.forms).flatMap((slots) => Object.values(slots)).filter((f): f is string => !!f);
  return [...forms, v.participle, v.gerund].flatMap(alternates);
}

// Accent- and case-insensitive: lemma first, then any form (fiz, pago), then a lemma prefix (fal -> falar).
export function findVerb(q: string, verbs: Verb[]): Verb | undefined {
  const key = bare(q);
  if (!key) return undefined;
  return (
    verbs.find((v) => bare(v.lemma) === key) ??
    verbs.find((v) => formsOf(v).some((f) => bare(f) === key)) ??
    verbs.find((v) => bare(v.lemma).startsWith(key))
  );
}

// Two forms of the most common verbs for one tense and person, shown as examples.
export function exampleForms(verbs: Verb[], tense: Tense, prompt: Prompt, n = 2): string[] {
  return [...verbs]
    .sort((a, b) => a.rank - b.rank)
    .map((v) => v.forms[tense]?.[PROMPT_SLOT[prompt]])
    .filter((f): f is string => !!f)
    .slice(0, n)
    .map((f) => alternates(f)[0]);
}
