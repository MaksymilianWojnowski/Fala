import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { parseRoute, type Route } from './lib/route';
import { loadVerbs, type VerbData } from './lib/data';
import { idbStore } from './lib/store';
import type { Item } from './lib/types';
import { Session } from './screens/Session';
import { Today } from './screens/Today';

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

  useEffect(() => {
    void loadVerbs().then(setVerbs);
  }, []);

  let screen: ReactNode = <h1>{route.name}</h1>;
  if (verbs && route.name === 'today') screen = <Today store={store} verbs={verbs} onStart={() => restart()} />;
  if (verbs && route.name === 'session') {
    screen = <Session key={run.key} store={store} verbs={verbs} route={route} override={run.override} onReview={restart} />;
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
