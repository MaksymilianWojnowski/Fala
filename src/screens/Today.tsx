import { useEffect, useState, useSyncExternalStore } from 'react';
import { loadSentences, type VerbData } from '../lib/data';
import { buildSession } from '../lib/scheduler';
import { loadVoices, pickVoice } from '../lib/speech';
import { STAGE_NAMES, UNITS, unitForTense } from '../content/units';
import { TENSE_NAMES } from '../lib/names';
import { currentUnit, endOfTomorrow, promptAccuracy, reviewsDueBy, streak, unitProgress, weakSpots } from '../lib/stats';
import { toHash } from '../lib/route';
import { plural } from '../lib/text';
import { exampleForms } from '../lib/verbs';
import { getSyncStatus, subscribeSync } from '../lib/sync';
import type { CardState, Item, Prompt, ReviewLog, Settings, Store, Tense, Unit, UnitState } from '../lib/types';
import { Bar, Icon } from './ui';

interface TodayData {
  settings: Settings;
  cards: Map<string, CardState>;
  units: Map<string, UnitState>;
  logs: ReviewLog[];
  items: Item[];
  tomorrow: number;
  now: number;
  current?: { unit: Unit; learned: number; total: number };
  weak: { tense: Tense; prompt: Prompt; pct: number; forms: string[] }[];
}

interface Props {
  store: Store;
  verbs: VerbData;
  onStart: () => void;
}

export function Today({ store, verbs, onStart }: Props) {
  const [d, setD] = useState<TodayData>();
  const [startFailed, setStartFailed] = useState(false);
  // A sync on app open can bring in reviews from another device; reload when it finishes.
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [cards, units, logs, settings, sentences, voices] = await Promise.all([
        store.cards(), store.units(), store.logs(), store.settings(), loadSentences(), loadVoices(),
      ]);
      const now = Date.now();
      const items = buildSession({
        cards, units, settings, now, verbs: verbs.list, sentences, rng: Math.random, hasVoice: !!pickVoice(voices, settings.voice),
      });
      const tomorrow = reviewsDueBy(cards.values(), endOfTomorrow(now));
      const cur = currentUnit(units);
      const unit = UNITS.find((u) => u.id === cur?.id);
      const current = unit && { unit, ...unitProgress(unit, cards, verbs.list) };
      const weak = weakSpots(promptAccuracy(cards.values())).map((w) => ({ ...w, forms: exampleForms(verbs.list, w.tense, w.prompt) }));
      if (live) setD({ settings, cards, units, logs, items, tomorrow, now, current, weak });
    })();
    return () => {
      live = false;
    };
  }, [store, verbs, sync]);

  if (!d) return null;

  const active = [...d.units.values()].some((u) => u.status === 'learning' || u.status === 'known');
  const reviews = d.items.filter((i) => d.cards.has(i.cardId)).length;
  const news = d.items.length - reviews;
  const days = d.settings.streak ? streak(d.logs, d.now) : 0;
  const tomorrowText = `Tomorrow: ${plural(d.tomorrow, 'review', 'reviews')}`;

  const startPresente = async () => {
    try {
      await store.putUnit({ id: 'pres_reg', status: 'learning', updatedAt: Date.now() });
    } catch {
      setStartFailed(true);
      return;
    }
    onStart();
    location.hash = '#/session';
  };

  const date = new Date(d.now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="screen">
      <header className="top">
        <span className="brand">fala</span>
        <a className="icon-btn" href="#/settings" aria-label="Settings"><Icon name="settings" /></a>
      </header>

      {!active ? (
        <section className="stack">
          <p className="lede">Start with the present tense. You can pick any tense later in Path.</p>
          <button type="button" className="btn btn--primary btn--block" onClick={startPresente}>
            Start learning Presente
          </button>
          {startFailed && (
            <p role="alert" className="notice">
              <Icon name="alert" /> Couldn't start. Try again.
            </p>
          )}
        </section>
      ) : d.items.length === 0 ? (
        <section className="stack">
          <p className="muted">{date}</p>
          <h1 className="display">All done for today</h1>
          <p className="muted">{tomorrowText}</p>
        </section>
      ) : (
        <section className="stack">
          <p className="muted">{date}</p>
          <h1 className="display">{plural(reviews, 'review', 'reviews')} · {news} new</h1>
          <p className="muted">About {plural(d.settings.minutes, 'minute', 'minutes')}</p>
          <a className="btn btn--primary btn--block" href="#/session" onClick={onStart}>
            Start session <Icon name="arrow" />
          </a>
          <p className="muted center">{days > 0 && `${plural(days, 'day in a row', 'days in a row')} · `}{tomorrowText}</p>
        </section>
      )}

      {d.weak.length > 0 && (
        <section className="stack">
          <h2 className="eyebrow">Weak spots</h2>
          <div className="path-list">
            {d.weak.map((w) => (
              <a key={`${w.tense}.${w.prompt}`} className="weak-row" href={toHash({ name: 'learn', unit: unitForTense(w.tense).id })}>
                <span className="weak-row__main">
                  <span className="weak-row__name pt" lang="pt-BR">{`${TENSE_NAMES[w.tense]} · ${w.prompt}`}</span>
                  <span className="weak-row__forms pt" lang="pt-BR">{w.forms.join(' · ')}</span>
                </span>
                <span className={`weak-row__pct${w.pct < 60 ? ' weak-row__pct--bad' : w.pct < 75 ? ' weak-row__pct--warn' : ''}`}>{`${w.pct}%`}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {d.current && (
        <section className="stack">
          <h2 className="eyebrow">Continue learning</h2>
          <div className="card continue-card">
            <div className="row-between">
              <span className="medium" lang="pt-BR">{d.current.unit.name}</span>
              <span className="muted small">{`Stage ${d.current.unit.stage} · ${STAGE_NAMES[d.current.unit.stage - 1]}`}</span>
            </div>
            <span className="continue-card__example pt" lang="pt-BR">{d.current.unit.example}</span>
            <div className="continue-card__progress">
              <Bar pct={d.current.total ? Math.round((d.current.learned / d.current.total) * 100) : 0} />
              <span className="muted small">{`${d.current.learned} / ${d.current.total} verbs`}</span>
            </div>
            <div className="continue-card__actions">
              <a className="continue-card__learn" href={toHash({ name: 'learn', unit: d.current.unit.id })}>Learn</a>
              <a className="continue-card__practice" href="#/session" onClick={onStart}>Practice</a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
