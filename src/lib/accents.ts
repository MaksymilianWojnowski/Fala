// Accent accepted from the user's typed mark, so ASCII ' or the typographic ’ / ´ all work.
export const ACCENT_KEYS = ['á','â','ã','à','é','ê','í','ó','ô','õ','ú','ç'];

const COMBOS: Array<[string, string]> = [
  ["a'", 'á'], ['a^', 'â'], ['a~', 'ã'], ['a`', 'à'],
  ["e'", 'é'], ['e^', 'ê'],
  ["i'", 'í'],
  ["o'", 'ó'], ['o^', 'ô'], ['o~', 'õ'],
  ["u'", 'ú'],
  ['c,', 'ç'],
];

const MAP = new Map<string, string>();
for (const [pair, out] of COMBOS) {
  MAP.set(pair, out);
  MAP.set(pair[0].toUpperCase() + pair[1], out.toUpperCase());
}

export function insertAt(value: string, caret: number, text: string): { value: string; caret: number } {
  return {
    value: value.slice(0, caret) + text + value.slice(caret),
    caret: caret + text.length,
  };
}

export function applyAccentCombo(value: string, caret: number): { value: string; caret: number } {
  if (caret < 2) return { value, caret };
  const pair = value.slice(caret - 2, caret).replace(/[’´]/g, "'");
  const out = MAP.get(pair);
  if (out === undefined) return { value, caret };
  return {
    value: value.slice(0, caret - 2) + out + value.slice(caret),
    caret: caret - 1,
  };
}
