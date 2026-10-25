import type { Verb } from './types';

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
