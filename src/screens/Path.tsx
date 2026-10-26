import { useEffect, useState, useSyncExternalStore } from 'react';
import { STAGE_NAMES, UNITS } from '../content/units';
import type { VerbData } from '../lib/data';
import { toHash } from '../lib/route';
import { getSyncStatus, subscribeSync } from '../lib/sync';
import { currentUnit, unitProgress } from '../lib/stats';
import type { CardState, Store, Unit, UnitState } from '../lib/types';
import { Icon } from './ui';

interface Props {
  store: Store;
  verbs: VerbData;
}

interface Data {
  cards: Map<string, CardState>;
  units: Map<string, UnitState>;
}

const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

export function Path({ store, verbs }: Props) {
  const [d, setD] = useState<Data>();
  const [stage4Open, setStage4Open] = useState(false);
  // Reload when a sync finishes so units started on another device show up.
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [cards, units] = await Promise.all([store.cards(), store.units()]);
      if (live) setD({ cards, units });
    })();
    return () => {
      live = false;
    };
  }, [store, sync]);

  if (!d) return null;
  const current = currentUnit(d.units)?.id;
  const statusOf = (u: Unit) => d.units.get(u.id)?.status ?? 'new';

  return (
    <div className="screen">
      <header className="stack-tight">
        <h1 className="display">Path</h1>
        <p className="muted">Ordered by how often you'll hear each tense in Brazil. Open any of them, in any order.</p>
      </header>

      {STAGE_NAMES.map((stageName, i) => {
        const stage = i + 1;
        const units = UNITS.filter((u) => u.stage === stage);
        const known = units.filter((u) => statusOf(u) === 'known').length;
        const learning = units.filter((u) => statusOf(u) === 'learning').length;
        const parts: string[] = [];
        if (known) parts.push(`${known} of ${units.length} known`);
        if (learning) parts.push(`${learning} in progress`);
        // Stage 4 stays one collapsed row until one of its units is started.
        const collapsed = stage === 4 && !stage4Open && known + learning === 0;

        return (
          <section key={stage} className="stack">
            <div className="stage__head">
              <h2>{`${stage} · ${stageName}`}</h2>
              <span className="muted small">{parts.join(' · ') || 'new'}</span>
            </div>
            {collapsed ? (
              <button type="button" className="path-collapsed" onClick={() => setStage4Open(true)}>
                <span className="pt" lang="pt-BR">{units.map((u) => u.example).join(' · ')}</span>
                <Icon name="chevron" size={18} />
              </button>
            ) : (
              <div className="path-list">
                {units.map((u) => {
                  const status = statusOf(u);
                  const { learned, total } = unitProgress(u, d.cards, verbs.list);
                  return (
                    <div key={u.id} className={`path-row${u.id === current ? ' path-row--current' : ''}`}>
                      <a className="path-row__main" href={toHash({ name: 'learn', unit: u.id })}>
                        <span className="path-row__name">
                          <span lang="pt-BR">{u.name}</span>
                          {u.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                        </span>
                        <span className="path-row__example pt" lang="pt-BR">{u.example}</span>
                      </a>
                      {status === 'known' && (
                        <span className="path-row__status path-row__status--ok"><Icon name="check" size={16} />Known</span>
                      )}
                      {status === 'learning' && <span className="path-row__status">{pct(learned, total)}%</span>}
                      {status === 'new' && (
                        <a className="path-test" href={toHash({ name: 'session', unit: u.id, test: true })}>Test me</a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
