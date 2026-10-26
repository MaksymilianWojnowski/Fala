export interface Env {
  FALA: { get(k: string): Promise<string | null>; put(k: string, v: string): Promise<void> };
  ORIGIN: string;
}

const CODE = /^[A-Za-z0-9_-]{22}$/;
const MAX_BYTES = 5_000_000;
const PATH = /^\/v1\/state\/([^/]+)$/;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = {
      'Access-Control-Allow-Origin': env.ORIGIN,
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    };
    const reply = (status: number, body?: string, extra: Record<string, string> = {}) =>
      new Response(body ?? null, { status, headers: { ...headers, ...extra } });

    if (req.method === 'OPTIONS') return reply(204);
    const code = PATH.exec(new URL(req.url).pathname)?.[1];
    if (code === undefined) return reply(404);
    if (!CODE.test(code)) return reply(400);

    if (req.method === 'GET') {
      const body = await env.FALA.get(code);
      return body === null ? reply(404) : reply(200, body, { 'content-type': 'application/json' });
    }
    if (req.method === 'PUT') {
      if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES) return reply(413);
      const text = await req.text();
      if (new TextEncoder().encode(text).byteLength > MAX_BYTES) return reply(413);
      try {
        JSON.parse(text);
      } catch {
        return reply(400);
      }
      await env.FALA.put(code, text);
      return reply(204);
    }
    return reply(404);
  },
};
