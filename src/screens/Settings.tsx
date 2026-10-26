import { useEffect, useState, type ReactNode } from 'react';
import { isBr, loadVoices, pickVoice, speak } from '../lib/speech';
import { applyTheme } from '../lib/theme';
import { toHash } from '../lib/route';
import type { Settings as SettingsData, Store } from '../lib/types';
import { Icon } from './ui';

interface Props {
  store: Store;
}

const MINUTES: SettingsData['minutes'][] = [5, 10, 20];
const THEMES: { value: SettingsData['theme']; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Settings({ store }: Props) {
  const [s, setS] = useState<SettingsData>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([store.settings(), loadVoices()]).then(([settings, vs]) => {
      if (!live) return;
      setS(settings);
      setVoices(vs);
    });
    return () => {
      live = false;
    };
  }, [store]);

  if (!s) return null;

  // Every change is saved at once, stamped with updatedAt so sync can tell which copy is newer.
  const update = (patch: Partial<SettingsData>) => {
    const next = { ...s, ...patch, updatedAt: Date.now() };
    setS(next);
    setFailed(false);
    if (patch.theme) applyTheme(next.theme);
    void store.putSettings(next).catch(() => setFailed(true));
  };

  const br = voices.filter(isBr);
  const voice = pickVoice(voices, s.voice);

  return (
    <div className="screen settings">
      <a className="back" href={toHash({ name: 'today' })}><Icon name="chevron" size={18} />Today</a>
      <h1 className="display">Settings</h1>
      {failed && (
        <p role="alert" className="notice"><Icon name="alert" /> Couldn't save. Try again.</p>
      )}

      <Section title="Session">
        <fieldset className="field-group">
          <legend className="field-label">Length</legend>
          <div className="segmented">
            {MINUTES.map((m) => (
              <label key={m} className="segmented__item">
                <input type="radio" name="minutes" checked={s.minutes === m} onChange={() => update({ minutes: m })} />
                <span>{`${m} min`}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field-row">
          <span>New cards per day</span>
          <input
            type="number"
            className="num-input"
            min={0}
            max={30}
            value={s.newPerDay}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              if (Number.isFinite(n)) update({ newPerDay: Math.min(30, Math.max(0, n)) });
            }}
          />
        </label>
        <label className="field-row">
          <span>Show streak</span>
          <input type="checkbox" checked={s.streak} onChange={(e) => update({ streak: e.target.checked })} />
        </label>
      </Section>

      <Section title="Answers">
        <label className="field-row">
          <span>Include <span className="pt" lang="pt-BR">tu</span></span>
          <input type="checkbox" checked={s.tu} onChange={(e) => update({ tu: e.target.checked })} />
        </label>
        <label className="field-row">
          <span>Strict accents</span>
          <input type="checkbox" checked={s.strictAccents} onChange={(e) => update({ strictAccents: e.target.checked })} />
        </label>
        <label className="field-row">
          <span>Accent shortcuts (<span className="pt" lang="pt-BR">a' → á</span>)</span>
          <input type="checkbox" checked={s.accentCombos} onChange={(e) => update({ accentCombos: e.target.checked })} />
        </label>
      </Section>

      <Section title="Audio">
        <label className="field-row">
          <span>Voice</span>
          <select
            className="select pt"
            lang="pt-BR"
            value={s.voice ?? ''}
            onChange={(e) => update({ voice: e.target.value || undefined })}
          >
            <option value="">Automatic</option>
            {br.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
        </label>
        {br.length === 0 && <p className="muted small">No pt-BR voice on this device.</p>}
        <button
          type="button"
          className="btn btn--ghost"
          disabled={!voice}
          onClick={() => voice && speak('Tudo bem com você?', voice)}
        >
          Test
        </button>
      </Section>

      <Section title="Appearance">
        <fieldset className="field-group">
          <legend className="field-label">Theme</legend>
          <div className="segmented">
            {THEMES.map((t) => (
              <label key={t.value} className="segmented__item">
                <input type="radio" name="theme" checked={s.theme === t.value} onChange={() => update({ theme: t.value })} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="Sync" />

      <Section title="About">
        <p className="muted small">Sentences from Tatoeba (tatoeba.org), CC BY 2.0 FR, by their contributors.</p>
        <p className="muted small">Conjugations generated with verbecc and checked against Wiktionary via kaikki.org (CC BY-SA).</p>
        <p className="muted small">Verb frequency from FrequencyWords by Hermit Dave (CC BY-SA 4.0).</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="stack">
      <h2 className="eyebrow">{title}</h2>
      {children && <div className="card settings__body">{children}</div>}
    </section>
  );
}
