import { ACCENT_KEYS } from '../lib/accents';

const PATHS = {
  check: <><circle cx="12" cy="12" r="9" /><path d="M7.5 12.5l3 3 6-6.5" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
  miss: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  settings: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  eyeOff: <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.7 9.7 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.8M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.4 9.4 0 0 0 5.4-1.6" />,
  listen: <path d="M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />,
  flag: <path d="M5 21V4h12l-2 4 2 4H5" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

// Sticky top bar on every screen except a session: brand (or a back link) and Settings.
export function AppBar({ back, onSettings }: { back?: { href: string; label: string }; onSettings?: boolean }) {
  return (
    <header className="appbar">
      <div className="appbar__inner">
        {back ? (
          <a className="back" href={back.href}><Icon name="chevron" size={18} />{back.label}</a>
        ) : (
          <a className="brand" href="#/today" aria-label="Fala, go to Today">fala</a>
        )}
        <a className="icon-btn" href="#/settings" aria-label="Settings" aria-current={onSettings ? 'page' : undefined}>
          <Icon name="settings" />
        </a>
      </div>
    </header>
  );
}

// Chips only carry Portuguese (tense names, pronouns), so they always get pt-BR and .pt.
export function Chip({ children, accent }: { children: string; accent?: boolean }) {
  return <span className={`pt chip${accent ? ' chip--accent' : ''}`} lang="pt-BR">{children}</span>;
}

// pct is the solid fill; delta is a lighter segment after it (both 0-100).
export function Bar({ pct, delta = 0 }: { pct: number; delta?: number }) {
  return (
    <div className="bar" aria-hidden="true">
      <div className="bar__fill" style={{ width: `${pct}%` }} />
      {delta > 0 && <div className="bar__delta" style={{ width: `${delta}%` }} />}
    </div>
  );
}

// Keys keep focus in the answer input (mousedown is cancelled) so the caret stays put.
export function AccentBar({ onInsert }: { onInsert: (ch: string) => void }) {
  return (
    <div className="accent-bar" role="group" aria-label="Insert accented letter">
      {ACCENT_KEYS.map((ch) => (
        <button
          key={ch}
          type="button"
          className="accent-key pt"
          lang="pt-BR"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(ch)}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
