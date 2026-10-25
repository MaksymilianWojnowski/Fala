import { ACCENT_KEYS } from '../lib/accents';

const PATHS = {
  check: <><circle cx="12" cy="12" r="9" /><path d="M7.5 12.5l3 3 6-6.5" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
  miss: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  settings: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
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

export function Chip({ children, accent, lang }: { children: string; accent?: boolean; lang?: string }) {
  return <span className={accent ? 'chip chip--accent' : 'chip'} lang={lang}>{children}</span>;
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
