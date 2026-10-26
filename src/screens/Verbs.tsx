import { useEffect, useState } from 'react';
import type { VerbData } from '../lib/data';
import { PROMPT_PRONOUNS, PROMPT_SLOT, TENSES, TENSE_NAMES, alternates, promptsFor } from '../lib/names';
import { toHash } from '../lib/route';
import { loadVoices, pickVoice, speak } from '../lib/speech';
import { findVerb } from '../lib/verbs';
import { verbSession } from '../lib/scheduler';
import type { CardState, Settings, Store, Tense, UnitState, Verb } from '../lib/types';
import { Icon } from './ui';

interface Props {
  store: Store;
  verbs: VerbData;
  lemma?: string;
}

// The six tenses people reach for most; the rest sit behind "Show all".
const COMMON: Tense[] = ['pres', 'perf', 'imperf', 'cond', 'subj_pres', 'subj_imperf'];
const TENSE_ORDER: Tense[] = [...COMMON, ...TENSES.filter((t) => !COMMON.includes(t))];

export function Verbs({ store, verbs, lemma }: Props) {
  // Keyed by the route lemma in App, so a new #/verbs/:lemma pre-fills again.
  const [q, setQ] = useState(lemma ?? '');
  const [all, setAll] = useState(false);
  const [tu, setTu] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice>();
  const [state, setState] = useState<{ cards: Map<string, CardState>; units: Map<string, UnitState>; settings: Settings }>();

  useEffect(() => {
    let live = true;
    void Promise.all([store.settings(), loadVoices()]).then(([s, voices]) => {
      if (!live) return;
      setTu(s.tu);
      setVoice(pickVoice(voices, s.voice));
    });
    // Practice only builds conjugation items, so the sentence set is not needed here.
    void Promise.all([store.cards(), store.units(), store.settings()]).then(([cards, units, settings]) => {
      if (live) setState({ cards, units, settings });
    });
    return () => {
      live = false;
    };
  }, [store]);

  const verb = q.trim() ? findVerb(q, verbs.list) : undefined;
  // Undefined while loading; the Practice button only appears when the session has items.
  const practice = verb && state
    ? verbSession(verb.lemma, { ...state, sentences: [], now: Date.now(), verbs: verbs.list, rng: Math.random, hasVoice: !!voice })
    : undefined;

  return (
    <div className="screen">
      <header className="stack-tight">
        <h1 className="display">Verbs</h1>
      </header>

      <div className="stack-tight">
        <label className="label" htmlFor="verb-search">Search any verb or form</label>
        <div className="search">
          <Icon name="search" size={18} />
          <input
            id="verb-search"
            className="search__input pt"
            lang="pt-BR"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {q.trim() && !verb && <p className="muted">No verb matches that.</p>}

      {verb && (
        <VerbDetail
          verb={verb}
          tu={tu}
          all={all}
          onToggleAll={() => setAll((v) => !v)}
          voice={voice}
          canPractice={practice ? practice.length > 0 : undefined}
        />
      )}
    </div>
  );
}

function VerbDetail({ verb, tu, all, onToggleAll, voice, canPractice }: {
  verb: Verb;
  tu: boolean;
  all: boolean;
  onToggleAll: () => void;
  voice?: SpeechSynthesisVoice;
  canPractice?: boolean;
}) {
  const shown = all ? TENSE_ORDER : COMMON;
  const rank = verb.rank <= 20 ? 'top 20 verb' : verb.rank <= 50 ? 'top 50 verb' : undefined;

  return (
    <>
      <section className="stack-tight">
        <div className="row-between">
          <span className="verb__lemma pt" lang="pt-BR">{verb.lemma}</span>
          <span className="muted">{verb.en}</span>
        </div>
        <div className="chips chips--start">
          {verb.irregular.length > 0 && <span className="chip">irregular</span>}
          {rank && <span className="chip">{rank}</span>}
          <span className="chip pt" lang="pt-BR">{`${alternates(verb.participle).join(' / ')} · ${verb.gerund}`}</span>
        </div>
        <p className="muted small legend">
          <span className="pt" lang="pt-BR">você</span> = <span className="pt" lang="pt-BR">ele, ela</span> · <span className="pt" lang="pt-BR">vocês</span> = <span className="pt" lang="pt-BR">eles, elas</span> · <b className="legend__irr">teal</b> = irregular form
        </p>
      </section>

      <div className="tense-grid">
        {shown.map((t) => (
          <TenseCard key={t} verb={verb} tense={t} tu={tu} />
        ))}
      </div>

      <button type="button" className="more-btn" onClick={onToggleAll}>
        {all ? 'Show fewer tenses' : `Show all ${TENSES.length} tenses`}
        <Icon name="chevron" size={18} />
      </button>

      <div className="verb-actions">
        {voice && (
          <button type="button" className="listen-btn" onClick={() => speak(verb.lemma, voice)}>
            <Icon name="listen" size={18} /> Listen
          </button>
        )}
        {canPractice === true && (
          <a className="btn btn--primary" href={toHash({ name: 'session', verb: verb.lemma })}>
            Practice <span className="pt" lang="pt-BR">{verb.lemma}</span>
          </a>
        )}
        {canPractice === false && <p className="muted small">Nothing to practice for <span className="pt" lang="pt-BR">{verb.lemma}</span> right now.</p>}
      </div>
    </>
  );
}

function TenseCard({ verb, tense, tu }: { verb: Verb; tense: Tense; tu: boolean }) {
  return (
    <div className="card tense-card" lang="pt-BR">
      <span className="tense-card__name pt">{TENSE_NAMES[tense]}</span>
      {promptsFor(tense, tu).map((p) => {
        const slot = PROMPT_SLOT[p];
        const form = verb.forms[tense]?.[slot];
        const irregular = verb.irregular.includes(`${tense}.${slot}`);
        return (
          <div key={p} className="tense-row">
            <span className="tense-row__who pt">{PROMPT_PRONOUNS[p][0]}</span>
            <span className={`tense-row__form pt${irregular ? ' tense-row__form--irregular' : ''}`}>
              {form ? alternates(form).join(' / ') : '–'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
