import { expect, test } from 'vitest';
import { parseRoute, toHash } from './route';

test('parses routes', () => {
  expect(parseRoute('')).toEqual({ name: 'today' });
  expect(parseRoute('#/learn/perf')).toEqual({ name: 'learn', unit: 'perf' });
  expect(parseRoute('#/verbs/fazer')).toEqual({ name: 'verbs', lemma: 'fazer' });
  expect(parseRoute('#/verbs')).toEqual({ name: 'verbs' });
  expect(parseRoute('#/session?unit=perf&test=1')).toEqual({ name: 'session', unit: 'perf', test: true });
  expect(parseRoute('#/session?verb=p%C3%B4r')).toEqual({ name: 'session', verb: 'pôr' });
  expect(parseRoute('#/settings?sync=abc')).toEqual({ name: 'settings', sync: 'abc' });
  expect(parseRoute('#/nope')).toEqual({ name: 'today' });
  expect(parseRoute('#/verbs/p%C3%B4r')).toEqual({ name: 'verbs', lemma: 'pôr' });
  expect(parseRoute('#/verbs/%E0%A4%A')).toEqual({ name: 'today' });
});

test('toHash round-trips', () => {
  expect(toHash({ name: 'verbs', lemma: 'pôr' })).toBe('#/verbs/p%C3%B4r');
  for (const h of ['#/learn/perf', '#/verbs/fazer', '#/verbs/p%C3%B4r', '#/session?unit=perf&test=1', '#/settings?sync=abc', '#/today'])
    expect(parseRoute(toHash(parseRoute(h)))).toEqual(parseRoute(h));
});
