import type { Sentence, Verb } from './types';
import { CONTRAST } from '../content/contrast';

export interface VerbData {
  list: Verb[];
  byLemma: Map<string, Verb>;
}

let cached: Promise<VerbData> | undefined;

// Loaded on demand so the verb table is fetched once, not in the entry chunk.
export function loadVerbs(): Promise<VerbData> {
  cached ??= import('../data/verbs.json').then((m) => {
    const list = m.default as unknown as Verb[];
    return { list, byLemma: new Map(list.map((v) => [v.lemma, v])) };
  });
  return cached;
}

let sentences: Promise<Sentence[]> | undefined;

// Curated contrast sentences ride along with the Tatoeba set; the 2.4 MB file loads once, on first use.
export function loadSentences(): Promise<Sentence[]> {
  sentences ??= import('../data/sentences.json').then((m) => [
    ...(m.default as unknown as Sentence[]),
    ...CONTRAST,
  ]);
  return sentences;
}
