import { useSyncExternalStore } from 'react';
import { parseRoute, type Route } from './lib/route';

type TabName = 'today' | 'path' | 'progress' | 'verbs';

const TABS: { name: TabName; label: string; hash: string; icon: string }[] = [
  { name: 'today', label: 'Today', hash: '#/today', icon: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4' },
  { name: 'path', label: 'Path', hash: '#/path', icon: 'M4 6h6v4H4zM14 14h6v4h-6zM10 8h4v8' },
  { name: 'progress', label: 'Progress', hash: '#/progress', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { name: 'verbs', label: 'Verbs', hash: '#/verbs', icon: 'M4 5h16v14H4zM8 9h8M8 13h5' },
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

  return (
    <>
      <main>
        <h1>{route.name}</h1>
      </main>
      {route.name !== 'session' && (
        <nav aria-label="Main">
          {TABS.map((t) => (
            <a key={t.name} href={t.hash} aria-current={active === t.name ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              <span>{t.label}</span>
            </a>
          ))}
        </nav>
      )}
    </>
  );
}
