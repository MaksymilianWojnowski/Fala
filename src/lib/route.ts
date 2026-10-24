export type Route =
  | { name: 'today' }
  | { name: 'path' }
  | { name: 'learn'; unit: string }
  | { name: 'progress' }
  | { name: 'verbs'; lemma?: string }
  | { name: 'session'; unit?: string; test?: boolean; verb?: string }
  | { name: 'settings'; sync?: string };

const TODAY: Route = { name: 'today' };

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const q = new URLSearchParams(query);
  // Browsers percent-encode non-ASCII segments; a malformed escape (e.g. %E0%A4%A) throws and falls back to today.
  let seg: string | undefined;
  try {
    seg = parts[1] && decodeURIComponent(parts[1]);
  } catch {
    return TODAY;
  }
  switch (parts[0]) {
    case 'path':
      return { name: 'path' };
    case 'learn':
      return seg ? { name: 'learn', unit: seg } : TODAY;
    case 'progress':
      return { name: 'progress' };
    case 'verbs':
      return seg ? { name: 'verbs', lemma: seg } : { name: 'verbs' };
    case 'session': {
      const r: Route = { name: 'session' };
      if (q.has('unit')) r.unit = q.get('unit')!;
      if (q.get('test') === '1') r.test = true;
      if (q.has('verb')) r.verb = q.get('verb')!;
      return r;
    }
    case 'settings':
      return q.has('sync') ? { name: 'settings', sync: q.get('sync')! } : { name: 'settings' };
    default:
      return { name: 'today' };
  }
}

export function toHash(r: Route): string {
  switch (r.name) {
    case 'today':
      return '#/today';
    case 'path':
      return '#/path';
    case 'progress':
      return '#/progress';
    case 'learn':
      return `#/learn/${encodeURIComponent(r.unit)}`;
    case 'verbs':
      return r.lemma ? `#/verbs/${encodeURIComponent(r.lemma)}` : '#/verbs';
    case 'session': {
      const q = new URLSearchParams();
      if (r.unit) q.set('unit', r.unit);
      if (r.test) q.set('test', '1');
      if (r.verb) q.set('verb', r.verb);
      const s = q.toString();
      return s ? `#/session?${s}` : '#/session';
    }
    case 'settings':
      return r.sync ? `#/settings?sync=${encodeURIComponent(r.sync)}` : '#/settings';
  }
}
