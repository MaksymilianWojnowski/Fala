import { useEffect, useState, type ReactNode } from 'react';
import { LEARN } from '../content/learn';
import { STAGE_NAMES, UNITS } from '../content/units';
import { diffSpan } from '../lib/check';
import type { VerbData } from '../lib/data';
import { alternates, PROMPT_SLOT, promptsFor } from '../lib/names';
import { unitVerbs } from '../lib/scheduler';
import { toHash } from '../lib/route';
import { startLearning } from '../lib/store';
import { loadVoices, pickVoice, speak } from '../lib/speech';
import type { Prompt, Store, Tense, Verb } from '../lib/types';
import { Icon } from './ui';

interface Props {
  store: Store;
  verbs: VerbData;
  unitId: string;
}

const COLUMNS = [
  { ending: '-ar', lemma: 'falar' },
  { ending: '-er', lemma: 'comer' },
  { ending: '-ir', lemma: 'partir' },
];

// The highlighted part is the ending: what differs from the stem.
function formCell(verb: Verb | undefined, tense: Tense, p: Prompt): ReactNode {
  const form = verb?.forms[tense][PROMPT_SLOT[p]];
  if (!verb || !form) return '–';
  const f = alternates(form)[0];
  const [start, end] = diffSpan(f, verb.lemma.slice(0, -2));
  return <>{f.slice(0, start)}<b className="endings__hl">{f.slice(start, end)}</b>{f.slice(end)}</>;
}

export function Learn({ store, verbs, unitId }: Props) {
  const unit = UNITS.find((u) => u.id === unitId);
  const learn = unit && LEARN[unit.id];
  const [tu, setTu] = useState<boolean>();
  const [startFailed, setStartFailed] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice>();

  useEffect(() => {
    let live = true;
    void store.settings().then((s) => {
      if (live) setTu(s.tu);
    });
    void Promise.all([store.settings(), loadVoices()]).then(([s, voices]) => {
      if (live) setVoice(pickVoice(voices, s.voice));
    });
    return () => {
      live = false;
    };
  }, [store]);

  if (!unit || !learn) {
    return (
      <div className="screen">
        <a className="back" href={toHash({ name: 'path' })}><Icon name="chevron" size={18} />Path</a>
        <p className="muted">That unit doesn't exist.</p>
      </div>
    );
  }
  if (tu === undefined) return null;

  const tense = unit.tenses[0];
  const forms = COLUMNS.map((c) => verbs.byLemma.get(c.lemma));
  // Verbs with an irregular cell for this tense that the irregular table does not already show.
  const more = unitVerbs(unit, verbs.list).filter((v) => v.irregular.some((c) => c.startsWith(`${tense}.`))).length
    - learn.irregulars.length;

  const start = async () => {
    try {
      await startLearning(store, unit.id);
    } catch {
      setStartFailed(true);
      return;
    }
    location.hash = '#/session';
  };

  return (
    <div className="screen">
      <a className="back" href={toHash({ name: 'path' })}><Icon name="chevron" size={18} />Path</a>

      <section className="stack">
        <h1 className="display">{unit.name}</h1>
        <p className="learn__example pt" lang="pt-BR">{unit.example}</p>
        <div className="chips">
          <span className="chip">{`Stage ${unit.stage} · ${STAGE_NAMES[unit.stage - 1]}`}</span>
          {unit.tags.length > 0 && <span className="chip chip--accent">{unit.tags.join(' + ')}</span>}
        </div>
        <p className="lede">{learn.summary}</p>
      </section>

      <section className="stack">
        <h2 className="eyebrow">When to use it</h2>
        {learn.uses.map((use) => (
          <div key={use.title} className="card use">
            <span className="use__title">{use.title}</span>
            <span className="pt use__pt" lang="pt-BR">{use.pt}</span>
            <span className="muted small">{use.en}</span>
          </div>
        ))}
      </section>

      <section className="stack">
        <h2 className="eyebrow">Signal words</h2>
        <div className="signals pt" lang="pt-BR">
          {learn.signals.map((s) => <span key={s} className="signal">{s}</span>)}
        </div>
      </section>

      <section className="stack">
        <h2 className="eyebrow">Endings</h2>
        <div className="card endings-card">
          <table className="endings" lang="pt-BR">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Person</span></th>
                {COLUMNS.map((c) => (
                  <th key={c.lemma} scope="col">{c.ending} <span className="endings__verb">{c.lemma}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promptsFor(tense, tu).map((p) => (
                <tr key={p}>
                  <th scope="row">{p}</th>
                  {forms.map((v, i) => <td key={COLUMNS[i].lemma}>{formCell(v, tense, p)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {learn.note && <p className="note">{learn.note}</p>}
      </section>

      {(learn.irregulars.length > 0 || more > 0) && (
        <section className="stack">
          {learn.irregulars.length > 0 && (
            <>
              <h2 className="eyebrow">Irregular · learn these first</h2>
              <div className="card irregular" lang="pt-BR">
                {learn.irregulars.map((r) => (
                  <div key={r.verb} className="irregular__row">
                    <span className="irregular__verb">{r.label ?? r.verb}</span>
                    <span className="irregular__forms pt">{r.forms}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {more > 0 && <a className="more-link" href={toHash({ name: 'verbs' })}>{`${more} more in Verbs`}</a>}
        </section>
      )}

      <section className="stack">
        <h2 className="eyebrow">Examples</h2>
        <div className="card examples">
          {learn.examples.map((ex) => (
            <div key={ex.pt} className="example">
              <div className="example__row">
                <span className="pt example__pt" lang="pt-BR">{ex.pt}</span>
                {voice && (
                  <button type="button" className="listen-btn listen-btn--icon" aria-label="Listen to this example" onClick={() => speak(ex.pt, voice)}>
                    <Icon name="listen" size={18} />
                  </button>
                )}
              </div>
              <span className="muted small">{ex.en}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="learn__foot">
        {startFailed && (
          <p role="alert" className="notice"><Icon name="alert" /> Couldn't start. Try again.</p>
        )}
        <div className="learn__actions">
          <a className="btn btn--ghost learn__test" href={toHash({ name: 'session', unit: unit.id, test: true })}>
            Test me <span className="small muted">6 questions</span>
          </a>
          <button type="button" className="btn btn--primary" onClick={() => void start()}>Start learning</button>
        </div>
      </footer>
    </div>
  );
}
