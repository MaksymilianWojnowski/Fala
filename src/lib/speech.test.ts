import { expect, test } from 'vitest';
import { loadVoices, pickVoice } from './speech';

const v = (lang: string, name: string, localService = true) => ({ lang, name, localService });

test('pickVoice prefers pt-BR and never pt-PT', () => {
  expect(pickVoice([v('pt-PT', 'Joana'), v('pt-BR', 'Luciana')])?.name).toBe('Luciana');
  expect(pickVoice([v('pt-PT', 'Joana')])).toBeUndefined();
  expect(pickVoice([v('en-US', 'Sam')])).toBeUndefined();
});

test('pickVoice takes a local voice over a remote one, and accepts pt_BR', () => {
  expect(pickVoice([v('pt-BR', 'A', false), v('pt_BR', 'B')])?.name).toBe('B');
});

test('pickVoice honours the preferred name when it is pt-BR', () => {
  expect(pickVoice([v('pt-BR', 'A'), v('pt-BR', 'Felipe')], 'Felipe')?.name).toBe('Felipe');
  expect(pickVoice([v('pt-PT', 'Joana'), v('pt-BR', 'A')], 'Joana')?.name).toBe('A');
});

test('loadVoices resolves to nothing when speech synthesis is missing', async () => {
  expect(await loadVoices(10)).toEqual([]);
});
