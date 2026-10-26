import { expect, test } from 'vitest';
import worker, { type Env } from './index';

const CODE = 'A'.repeat(22);
const ORIGIN = 'https://fala.pages.dev';

function fakeEnv() {
  const map = new Map<string, string>();
  const env: Env = {
    FALA: {
      async get(k) { return map.get(k) ?? null; },
      async put(k, v) { map.set(k, v); },
    },
    ORIGIN,
  };
  return { env, map };
}

const url = (code: string) => `https://sync.test/v1/state/${code}`;
const call = (env: Env, req: Request) => worker.fetch(req, env);

test('GET unknown → 404', async () => {
  const { env } = fakeEnv();
  const res = await call(env, new Request(url(CODE)));
  expect(res.status).toBe(404);
});

test('PUT then GET returns body with CORS header', async () => {
  const { env } = fakeEnv();
  const body = JSON.stringify({ cards: [], logs: [], units: [], settings: {} });
  const put = await call(env, new Request(url(CODE), { method: 'PUT', body, headers: { 'content-type': 'application/json' } }));
  expect(put.status).toBe(204);
  const get = await call(env, new Request(url(CODE)));
  expect(get.status).toBe(200);
  expect(get.headers.get('access-control-allow-origin')).toBe(ORIGIN);
  expect(await get.text()).toBe(body);
});

test('bad code → 400', async () => {
  const { env } = fakeEnv();
  const res = await call(env, new Request(url('short'), { method: 'PUT', body: '{}' }));
  expect(res.status).toBe(400);
});

test('body over 5 MB → 413', async () => {
  const { env, map } = fakeEnv();
  const body = '"' + 'x'.repeat(5_000_000) + '"';
  const res = await call(env, new Request(url(CODE), { method: 'PUT', body }));
  expect(res.status).toBe(413);
  expect(map.size).toBe(0);
});

test('invalid JSON → 400', async () => {
  const { env, map } = fakeEnv();
  const res = await call(env, new Request(url(CODE), { method: 'PUT', body: '{nope' }));
  expect(res.status).toBe(400);
  expect(map.size).toBe(0);
});

test('OPTIONS → 204 with allow-methods', async () => {
  const { env } = fakeEnv();
  const res = await call(env, new Request(url(CODE), { method: 'OPTIONS' }));
  expect(res.status).toBe(204);
  expect(res.headers.get('access-control-allow-methods')).toBe('GET, PUT, OPTIONS');
  expect(res.headers.get('access-control-allow-headers')).toBe('content-type');
});

test('other paths → 404', async () => {
  const { env } = fakeEnv();
  const res = await call(env, new Request('https://sync.test/nope'));
  expect(res.status).toBe(404);
});
