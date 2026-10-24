import { test, expect } from 'vitest';
import { applyAccentCombo, insertAt, ACCENT_KEYS } from './accents';

test('no combo leaves text unchanged', () => {
  expect(applyAccentCombo('fiz', 3)).toEqual({ value: 'fiz', caret: 3 });
  expect(applyAccentCombo("a'x", 3)).toEqual({ value: "a'x", caret: 3 });
});

test('apostrophe combo', () => {
  expect(applyAccentCombo("brinca'", 7)).toEqual({ value: 'brincá', caret: 6 });
});

test('tilde combo', () => {
  expect(applyAccentCombo('na~', 3)).toEqual({ value: 'nã', caret: 2 });
});

test('alternative apostrophes U+2019 and U+00B4', () => {
  expect(applyAccentCombo('a’', 2)).toEqual({ value: 'á', caret: 1 });
  expect(applyAccentCombo('a´', 2)).toEqual({ value: 'á', caret: 1 });
});

test('cedilla combo', () => {
  expect(applyAccentCombo('fac,', 4)).toEqual({ value: 'faç', caret: 3 });
});

test('uppercase variants', () => {
  expect(applyAccentCombo("A'", 2)).toEqual({ value: 'Á', caret: 1 });
  expect(applyAccentCombo('C,', 2)).toEqual({ value: 'Ç', caret: 1 });
  expect(applyAccentCombo('O~', 2)).toEqual({ value: 'Õ', caret: 1 });
});

test('insertAt inserts at caret', () => {
  expect(insertAt('brinc', 5, 'á')).toEqual({ value: 'brincá', caret: 6 });
  expect(insertAt('ab', 1, 'x')).toEqual({ value: 'axb', caret: 2 });
});

test('ACCENT_KEYS order', () => {
  expect(ACCENT_KEYS).toEqual(['á','â','ã','à','é','ê','í','ó','ô','õ','ú','ç']);
});
