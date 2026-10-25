import { useEffect, useRef, useState } from 'react';
import { UNITS } from '../content/units';
import type { VerbData } from '../lib/data';
import { alternates } from '../lib/names';
import { applyPlacement, type BuildInput } from '../lib/scheduler';
import { expectedFor, untilText, type SessionState } from '../lib/session';
import { startLearning } from '../lib/store';
import { endOfTomorrow, reviewsDueBy, streak, unitProgress } from '../lib/stats';
import type { CardState, Item, ReviewLog, Settings, Store, Unit } from '../lib/types';
import { plural } from '../lib/text';
import { Bar, Icon } from './ui';

interface Props {
  state: SessionState;
  before: Map<string, CardState>;
  store: Store;
  verbs: VerbData;
  onReview: (items: Item[]) => void;
  testUnit?: Unit;
  onRestart: () => void;
}

interface After {
  cards: Map<string, CardState>;
  logs: ReviewLog[];
  settings: Settings;
}

const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

export function Summary(props: Props) {
  if (props.testUnit) return <PlacementResult {...props} unit={props.testUnit} correct={props.state.counts.correct} />;
  return <ReviewSummary {...props} />;
}

// Saves the placement result once; StrictMode's second effect run reuses the same promise.
async function place(store: Store, verbs: VerbData, unit: Unit, correct: number): Promise<boolean> {
  const [cards, units, settings] = await Promise.all([store.cards(), store.units(), store.settings()]);
  const input: BuildInput = { cards, units, settings, now: Date.now(), verbs: verbs.list, sentences: [], rng: Math.random, hasVoice: false };
  const result = applyPlacement(unit, correct, input);
  if (result.unit) await store.putUnit(result.unit);
  for (const c of result.cards) await store.putCard(c);
  return result.unit !== undefined;
}

interface PlacementProps extends Props {
  unit: Unit;
  correct: number;
}

function PlacementResult({ unit, correct, store, verbs, onRestart }: PlacementProps) {
  const [passed, setPassed] = useState<boolean>();
  const [failed, setFailed] = useState(false);
  const run = useRef<Promise<boolean> | undefined>(undefined);

  useEffect(() => {
    run.current ??= place(store, verbs, unit, correct);
    run.current.then(setPassed, () => setFailed(true));
  }, [store, verbs, unit, correct]);

  const startFromFail = async () => {
    try {
      await startLearning(store, unit.id);
    } catch {
      setFailed(true);
      return;
    }
    onRestart();
    location.hash = '#/session';
  };

  if (failed) {
    return (
      <div className="screen">
        <p role="alert" className="notice"><Icon name="alert" /> Couldn't save this result. Try again.</p>
        <a className="btn btn--ghost btn--block" href="#/today">Done</a>
      </div>
    );
  }
  if (passed === undefined) return null;

  return (
    <div className="screen">
      <div className="stack center">
        <span className="hero-icon"><Icon name={passed ? 'check' : 'miss'} size={48} /></span>
        <h1 className="display">{unit.name}</h1>
        <p className="muted">
          {passed
            ? `Known · ${correct} of 6 correct. Its verbs join your reviews over the next two weeks.`
            : `${correct} of 6 correct.`}
        </p>
      </div>
      <footer className="stack">
        {!passed && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => void startFromFail()}>
            Start learning
          </button>
        )}
        <a className="btn btn--ghost btn--block" href="#/today">Done</a>
      </footer>
    </div>
  );
}

function ReviewSummary({ state, before, store, verbs, onReview }: Props) {
  const [after, setAfter] = useState<After>();

  useEffect(() => {
    let live = true;
    void (async () => {
      const [cards, logs, settings] = await Promise.all([store.cards(), store.logs(), store.settings()]);
      if (live) setAfter({ cards, logs, settings });
    })();
    return () => {
      live = false;
    };
  }, [store]);

  if (!after) return null;

  const { counts, missed } = state;
  const answered = counts.correct + counts.almost + counts.missed;
  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60e3));
  const rose = UNITS.map((u) => ({
    unit: u,
    b: unitProgress(u, before, verbs.list),
    a: unitProgress(u, after.cards, verbs.list),
  })).filter((x) => x.a.learned > x.b.learned);
  const tomorrow = reviewsDueBy(after.cards.values(), endOfTomorrow(Date.now()));
  const days = after.settings.streak ? streak(after.logs, Date.now()) : 0;

  return (
    <div className="screen">
      <div className="stack center">
        <span className="hero-icon"><Icon name="check" size={48} /></span>
        <h1 className="display">Session done</h1>
        <p className="muted">{plural(answered, 'card', 'cards')} · {plural(minutes, 'minute', 'minutes')}</p>
      </div>

      <div className="tiles">
        <div className="tile"><span className="tile__n tile--ok">{counts.correct}</span><span className="muted small">Correct</span></div>
        <div className="tile"><span className="tile__n tile--warn">{counts.almost}</span><span className="muted small">Almost</span></div>
        <div className="tile"><span className="tile__n tile--bad">{counts.missed}</span><span className="muted small">Missed</span></div>
      </div>

      {rose.length > 0 && (
        <section className="stack">
          <h2 className="eyebrow">Moved up</h2>
          <div className="card stack">
            {rose.map(({ unit, b, a }) => (
              <div key={unit.id} className="stack">
                <div className="row-between">
                  <span className="medium">{unit.name}</span>
                  <span className="muted">{pct(b.learned, b.total)}% → <b className="ok">{pct(a.learned, a.total)}%</b></span>
                </div>
                <Bar pct={pct(b.learned, b.total)} delta={pct(a.learned, a.total) - pct(b.learned, b.total)} />
              </div>
            ))}
          </div>
        </section>
      )}

      {missed.length > 0 && (
        <section className="stack">
          <h2 className="eyebrow">Coming back soon</h2>
          <div className="card list">
            {missed.map((item, i) => {
              const card = after.cards.get(item.cardId);
              const primary = alternates(expectedFor(item, verbs.byLemma))[0];
              const conj = item.kind === 'conjugate';
              const secondary = item.kind === 'conjugate' ? `${item.lemma} · ${item.pronoun}` : item.sentence.en;
              return (
                <div key={`${item.cardId}-${i}`} className="list__row">
                  <span className="row-baseline">
                    <span className="pt form" lang="pt-BR">{primary}</span>
                    <span className={conj ? 'small muted pt' : 'small muted'} lang={conj ? 'pt-BR' : 'en'}>{secondary}</span>
                  </span>
                  {card && <span className="small muted">{untilText(+card.fsrs.due - Date.now())}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="muted center">
        {days > 0 && `${plural(days, 'day in a row', 'days in a row')} · `}Tomorrow: {plural(tomorrow, 'review', 'reviews')}
      </p>

      <footer className="stack">
        {missed.length > 0 && (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => onReview(missed)}>
            Review the {plural(missed.length, 'miss', 'misses')} now
          </button>
        )}
        <a className="btn btn--primary btn--block" href="#/today">Done</a>
      </footer>
    </div>
  );
}
