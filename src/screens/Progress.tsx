import { useEffect, useState } from 'react';
import { State } from 'ts-fsrs';
import { UNITS } from '../content/units';
import { toHash } from '../lib/route';
import { TENSE_NAMES } from '../lib/names';
import { hardestVerbs, promptAccuracy, recall } from '../lib/stats';
import type { CardState, Prompt, ReviewLog, Store, UnitState } from '../lib/types';
import { Bar } from './ui';

interface Props {
  store: Store;
}

interface Data {
  cards: Map<string, CardState>;
  logs: ReviewLog[];
  units: Map<string, UnitState>;
  now: number;
}

const PEOPLE: Prompt[] = ['eu', 'você', 'a gente', 'nós', 'vocês'];
const LEGEND = ['90+', '75–89', '60–74', 'under 60'];

// Cell shade: 1 is the best band, 4 the worst.
const level = (pct: number) => (pct >= 90 ? 1 : pct >= 75 ? 2 : pct >= 60 ? 3 : 4);

export function Progress({ store }: Props) {
  const [d, setD] = useState<Data>();

  useEffect(() => {
    let live = true;
    void (async () => {
      const [cards, logs, units] = await Promise.all([store.cards(), store.logs(), store.units()]);
      if (live) setD({ cards, logs, units, now: Date.now() });
    })();
    return () => {
      live = false;
    };
  }, [store]);

  if (!d) return null;

  const learned = [...d.cards.values()].filter((c) => c.fsrs.state === State.Review).length;
  const known = [...d.units.values()].filter((u) => u.status === 'known').length;
  const r = recall(d.logs, d.now);
  const acc = promptAccuracy(d.cards.values());
  const active = UNITS.filter((u) => {
    const s = d.units.get(u.id)?.status;
    return s === 'learning' || s === 'known';
  });
  const tenses = [...new Set(active.flatMap((u) => u.tenses))];

  // Weakest person across all tenses, once it has 10 attempts to go on.
  const byPerson = new Map<string, { ok: number; total: number }>();
  for (const [key, cell] of acc) {
    const person = key.slice(key.indexOf('.') + 1);
    const cur = byPerson.get(person) ?? { ok: 0, total: 0 };
    byPerson.set(person, { ok: cur.ok + cell.ok, total: cur.total + cell.total });
  }
  const weakest = [...byPerson]
    .filter(([, c]) => c.total >= 10)
    .map(([person, c]) => ({ person, pct: Math.round((100 * c.ok) / c.total) }))
    .sort((a, b) => a.pct - b.pct)[0];

  const hardest = hardestVerbs(d.cards.values());

  return (
    <div className="screen">
      <header className="stack-tight">
        <h1 className="display">Progress</h1>
      </header>

      <div className="tiles">
        <div className="tile">
          <span className="tile__n">{learned}</span>
          <span className="small muted">cards learned</span>
        </div>
        <div className="tile">
          <span className="tile__n">{r === undefined ? '–' : `${Math.round(r * 100)}%`}</span>
          <span className="small muted">recall, 30 days</span>
        </div>
        <div className="tile">
          <span className="tile__n">{`${known} / ${UNITS.length}`}</span>
          <span className="small muted">units known</span>
        </div>
      </div>

      <section className="stack">
        <h2 className="eyebrow">Tense × person</h2>
        {tenses.length === 0 ? (
          <p className="muted">Start a unit in Path to see your grid.</p>
        ) : (
          <>
            <div className="card heat-card" lang="pt-BR">
              <div className="heat-row heat-row--head">
                <span />
                {PEOPLE.map((p) => <span key={p}>{p}</span>)}
              </div>
              {tenses.map((t) => (
                <div key={t} className="heat-row">
                  <span className="heat-row__name pt">{TENSE_NAMES[t]}</span>
                  {PEOPLE.map((p) => <HeatCell key={p} acc={acc.get(`${t}.${p}`)} />)}
                </div>
              ))}
              <div className="heat-legend small muted">
                {LEGEND.map((label, i) => (
                  <span key={label} className="heat-legend__item">
                    <span className={`heat-swatch heat-swatch--${i + 1}`} aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            {weakest && (
              <p className="note">
                <b className="pt" lang="pt-BR">{weakest.person}</b> is your weakest person ({weakest.pct}%).
              </p>
            )}
          </>
        )}
      </section>

      <section className="stack">
        <h2 className="eyebrow">Hardest verbs</h2>
        {hardest.length === 0 ? (
          <p className="muted">Not enough practice yet.</p>
        ) : (
          <div className="card hard-list" lang="pt-BR">
            {hardest.map((v) => (
              <a key={v.lemma} className="hard-row" href={toHash({ name: 'verbs', lemma: v.lemma })}>
                <span className="hard-row__lemma pt">{v.lemma}</span>
                <Bar pct={v.pct} />
                <span className="hard-row__pct">{v.pct}%</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HeatCell({ acc }: { acc?: { ok: number; total: number } }) {
  if (!acc || acc.total === 0) return <span className="heat heat--none">–</span>;
  const pct = Math.round((100 * acc.ok) / acc.total);
  return <span className={`heat heat--${level(pct)}`}>{pct}</span>;
}
