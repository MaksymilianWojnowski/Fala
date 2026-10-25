import { useEffect, useState } from 'react';
import { buildSession } from '../lib/scheduler';
import { endOfTomorrow, reviewsDueBy, streak } from '../lib/stats';
import { plural } from '../lib/text';
import type { VerbData } from '../lib/data';
import type { CardState, Item, ReviewLog, Settings, Store, UnitState } from '../lib/types';
import { Icon } from './ui';

interface TodayData {
  settings: Settings;
  cards: Map<string, CardState>;
  units: Map<string, UnitState>;
  logs: ReviewLog[];
  items: Item[];
  tomorrow: number;
  now: number;
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
      if (live) setD({ settings, cards, units, logs, items, tomorrow, now });
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
    </div>
  );
}
