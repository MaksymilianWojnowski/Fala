import { useEffect, useState } from 'react';
import { buildSession } from '../lib/scheduler';
import { UNITS, STAGE_NAMES } from '../content/units';
import { currentUnit, endOfTomorrow, reviewsDueBy, streak, unitProgress } from '../lib/stats';
import { toHash } from '../lib/route';
import { plural } from '../lib/text';
import type { VerbData } from '../lib/data';
import type { CardState, Item, ReviewLog, Settings, Store, Unit, UnitState } from '../lib/types';
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
}

interface Props {
  store: Store;
  verbs: VerbData;
  onStart: () => void;
}

export function Today({ store, verbs, onStart }: Props) {
  const [d, setD] = useState<TodayData>();
  const [startFailed, setStartFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [cards, units, logs, settings] = await Promise.all([store.cards(), store.units(), store.logs(), store.settings()]);
      const now = Date.now();
      const items = buildSession({ cards, units, settings, now, verbs: verbs.list, sentences: [], rng: Math.random, hasVoice: false });
      const tomorrow = reviewsDueBy(cards.values(), endOfTomorrow(now));
      const cur = currentUnit(units);
      const unit = UNITS.find((u) => u.id === cur?.id);
      const current = unit && { unit, ...unitProgress(unit, cards, verbs.list) };
      if (live) setD({ settings, cards, units, logs, items, tomorrow, now, current });
    })();
    return () => {
      live = false;
    };
  }, [store, verbs]);

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

      {d.current && (
        <section className="stack">
          <h2 className="eyebrow">Continue learning</h2>
          <div className="card continue-card">
            <div className="row-between">
              <span className="medium">{d.current.unit.name}</span>
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
