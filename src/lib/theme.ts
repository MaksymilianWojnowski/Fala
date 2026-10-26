import type { Settings } from './types';

// 'system' removes the attribute so the prefers-color-scheme rules in tokens.css apply.
export function applyTheme(theme: Settings['theme']): void {
  const el = document.documentElement;
  if (theme === 'system') delete el.dataset.theme;
  else el.dataset.theme = theme;
}
