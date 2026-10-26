import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { parseRoute, type Route } from './lib/route';
import { loadVerbs, type VerbData } from './lib/data';
import { idbStore } from './lib/store';
import { runSync } from './lib/sync';
import type { Item } from './lib/types';
import { Learn } from './screens/Learn';
import { Path } from './screens/Path';
import { Progress } from './screens/Progress';
import { Session } from './screens/Session';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { Verbs } from './screens/Verbs';
import { applyTheme } from './lib/theme';

type TabName = 'today' | 'path' | 'progress' | 'verbs';

const svgProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const TABS: { name: TabName; label: string; hash: string; icon: ReactNode }[] = [
  {
    name: 'today', label: 'Today', hash: '#/today',
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    name: 'path', label: 'Path', hash: '#/path',
    icon: (
      <svg {...svgProps}>
        <circle cx="6" cy="19" r="2" />
        <circle cx="18" cy="5" r="2" />
        <path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8" />
      </svg>
    ),
  },
  {
    name: 'progress', label: 'Progress', hash: '#/progress',
    icon: (
      <svg {...svgProps}>
        <path d="M4 20V11M10 20V5M16 20v-6M21 20H3" />
      </svg>
    ),
  },
  {
    name: 'verbs', label: 'Verbs', hash: '#/verbs',
    icon: (
      <svg {...svgProps}>
        <path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z" />
        <path d="M4 20a2 2 0 0 0 2 2h13v-4" />
      </svg>
    ),
  },
];

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => window.location.hash;

function activeTab(route: Route): TabName | undefined {
  if (route.name === 'learn') return 'path';
  return TABS.find((t) => t.name === route.name)?.name;
}

export function App() {
  const hash = useSyncExternalStore(subscribe, getHash);
  const route = parseRoute(hash);
  const active = activeTab(route);
  const [store] = useState(idbStore);
  const [verbs, setVerbs] = useState<VerbData>();
  // key remounts Session for a new run; override holds the misses for "Review the misses now".
  const [run, setRun] = useState<{ key: number; override?: Item[] }>({ key: 0 });
  const restart = (override?: Item[]) => setRun((r) => ({ key: r.key + 1, override }));
  // Entry points that are plain hash changes (Learn, Path) never call restart, so drop the misses once the session route is left.
  useEffect(() => {
    if (route.name !== 'session') setRun((r) => (r.override ? { ...r, override: undefined } : r));
  }, [route.name]);

  useEffect(() => {
    void loadVerbs().then(setVerbs);
  }, []);

  // Theme applies app-wide at startup, not only once the Settings screen is open.
  useEffect(() => {
    void store.settings().then((s) => applyTheme(s.theme));
  }, [store]);

  // Sync on open, then every 5 minutes while visible. runSync does nothing without a sync code.
  useEffect(() => {
    void runSync(store);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void runSync(store);
    }, 5 * 60e3);
    return () => clearInterval(id);
  }, [store]);

  let screen: ReactNode = <h1>{route.name}</h1>;
  if (verbs && route.name === 'today') screen = <Today store={store} verbs={verbs} onStart={() => restart()} />;
  if (verbs && route.name === 'path') screen = <Path store={store} verbs={verbs} />;
  if (verbs && route.name === 'learn') screen = <Learn key={route.unit} store={store} verbs={verbs} unitId={route.unit} />;
  if (route.name === 'progress') screen = <Progress store={store} />;
  // Keyed by lemma so a new #/verbs/:lemma pre-fills the search again.
  if (verbs && route.name === 'verbs') screen = <Verbs key={route.lemma ?? ''} store={store} verbs={verbs} lemma={route.lemma} />;
  if (route.name === 'settings') screen = <Settings store={store} incoming={route.sync} />;
  if (verbs && route.name === 'session') {
    screen = (
      <Session
        key={run.key} store={store} verbs={verbs} route={route} override={run.override}
        onReview={restart} onRestart={() => restart()}
      />
    );
  }

  return (
    <>
      <main className={route.name === 'session' ? 'main--bare' : undefined}>{screen}</main>
      {route.name !== 'session' && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <a
              key={t.name}
              className="tab"
              href={t.hash}
              aria-current={active === t.name ? 'page' : undefined}
            >
              {t.icon}
              <span>{t.label}</span>
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
