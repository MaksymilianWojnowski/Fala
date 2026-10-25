import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { applyAccentCombo, insertAt } from '../lib/accents';
import { diffSpan } from '../lib/check';
import type { VerbData } from '../lib/data';
import { PROMPT_PRONOUNS, PROMPT_SLOT, TENSE_NAMES, alternates, promptsFor } from '../lib/names';
import { buildSession, verbSession, type BuildInput } from '../lib/scheduler';
import {
  commitAnswer, reduce, startSession, untilText,
  type SessionAction, type SessionContext, type SessionState,
} from '../lib/session';
import type { CardState, Item, Prompt, Rating, Settings, Store, Tense, Verb } from '../lib/types';
import { Summary } from './Summary';
import { AccentBar, Bar, Chip, Icon } from './ui';

const RATING_NAME = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' } as const;
const FEEDBACK = {
  correct: { icon: 'check', text: 'Correct' },
  accent: { icon: 'alert', text: 'Almost · check the accent' },
  wrong: { icon: 'miss', text: 'Not quite' },
} as const;

interface Pending {
  item: Item;
  rating: Rating;
  input: string;
  now: number;
  busy?: boolean;
}

interface Props {
  store: Store;
  verbs: VerbData;
  route: { verb?: string; test?: boolean };
  override?: Item[];
  onReview: (items: Item[]) => void;
}

export function Session({ store, verbs, route, override, onReview }: Props) {
  const [boot, setBoot] = useState<{ before: Map<string, CardState>; settings: Settings }>();
  const [s, setS] = useState<SessionState>();
  const [value, setValue] = useState('');
  const [dueAt, setDueAt] = useState<number>();
  const [saveFailed, setSaveFailed] = useState(false);
  // Refs let the window key handler and double-fired events read the latest state synchronously.
  const latest = useRef<SessionState | undefined>(undefined);
  const cfg = useRef<{ ctx: SessionContext; settings: Settings } | undefined>(undefined);
  // Answers whose save failed; retried on Continue so none is lost silently.
  const pending = useRef<Pending[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Built once per mount; a key change in App remounts this for a new run.
  useEffect(() => {
    let live = true;
    void (async () => {
      const [cards, units, settings] = await Promise.all([store.cards(), store.units(), store.settings()]);
      const now = Date.now();
      const input: BuildInput = { cards, units, settings, now, verbs: verbs.list, sentences: [], rng: Math.random, hasVoice: false };
      const items = override ?? (route.verb ? verbSession(route.verb, input) : buildSession(input));
      if (!live) return;
      const first = startSession(items, now, settings.minutes, route.test ? 'test' : 'review');
      latest.current = first;
      cfg.current = { ctx: { verbs: verbs.byLemma, strictAccents: settings.strictAccents }, settings };
      setS(first);
      setBoot({ before: cards, settings });
    })();
    return () => {
      live = false;
    };
  }, []);

  function save(p: Pending): void {
    if (p.busy) return;
    p.busy = true;
    commitAnswer(store, p.item, p.rating, p.input, p.now).then(
      (c) => {
        pending.current = pending.current.filter((x) => x !== p);
        setSaveFailed(pending.current.length > 0);
        setDueAt(+c.fsrs.due);
      },
      () => {
        p.busy = false;
        if (!pending.current.includes(p)) pending.current = [...pending.current, p];
        setSaveFailed(true);
      },
    );
  }

  function dispatch(a: SessionAction) {
    const prev = latest.current;
    if (!prev || !cfg.current) return;
    const next = reduce(prev, a, cfg.current.ctx);
    if (next === prev) return;
    latest.current = next;
    setS(next);
    if (a.type === 'continue') {
      setValue('');
      setDueAt(undefined);
      pending.current.forEach(save);
    }
    if (a.type === 'submit' && next.mode === 'review') {
      save({ item: prev.items[prev.index], rating: next.last!.rating, input: a.input, now: a.now });
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') location.hash = '#/today';
      else if (e.key === 'Enter' && latest.current?.phase === 'feedback') {
        // Stops the readonly input's implicit form submit from grading the next item.
        e.preventDefault();
        dispatch({ type: 'continue', now: Date.now() });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (s?.phase === 'answer') inputRef.current?.focus();
  }, [s?.phase, s?.index]);

  useLayoutEffect(() => {
    if (caret.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [value]);

  if (!s || !boot) return null;
  if (s.phase === 'done') return <Summary state={s} before={boot.before} store={store} verbs={verbs} onReview={onReview} />;

  const { settings } = boot;
  const item = s.items[s.index];
  const conj = item.kind === 'conjugate' ? item : undefined;
  const en = item.kind === 'conjugate' ? item.lemma : item.sentence.en;
  const verb = conj && verbs.byLemma.get(conj.lemma);
  const feedback = s.phase === 'feedback' ? s.last : undefined;
  const shown = feedback ? alternates(feedback.expected)[0] : '';
  const [hs, he] = feedback ? diffSpan(feedback.expected, feedback.input) : [0, 0];

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    let next = e.target.value;
    let pos = e.target.selectionStart ?? next.length;
    if (settings.accentCombos) {
      const r = applyAccentCombo(next, pos);
      next = r.value;
      pos = r.caret;
    }
    caret.current = pos;
    setValue(next);
  }

  function insert(ch: string) {
    const r = insertAt(value, inputRef.current?.selectionStart ?? value.length, ch);
    caret.current = r.caret;
    setValue(r.value);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) dispatch({ type: 'submit', input: value, now: Date.now() });
  }

  return (
    <div className="session">
      <header className="session__top">
        <a className="icon-btn" href="#/today" aria-label="End session"><Icon name="close" /></a>
        <Bar pct={(s.index / s.items.length) * 100} />
        <span className="muted small">{s.index + 1} / {s.items.length}</span>
      </header>

      <div className="session__body">
        <div className="prompt">
          <span className="eyebrow">{conj ? 'Conjugate' : 'Translate'}</span>
          <span className="lemma pt" lang={conj ? 'pt-BR' : 'en'}>{en}</span>
          {conj && (
            <div className="chips">
              <Chip accent>{TENSE_NAMES[conj.tense]}</Chip>
              <Chip>{conj.pronoun}</Chip>
            </div>
          )}
        </div>

        <form className="answer-form" onSubmit={onSubmit}>
          {conj ? (
            <label className="label pt" lang="pt-BR" htmlFor="answer">{`${conj.pronoun} …`}</label>
          ) : (
            <label className="label" htmlFor="answer">Your answer</label>
          )}
          <input
            id="answer"
            ref={inputRef}
            className={`answer${feedback ? ` answer--${feedback.check.result}` : ''}`}
            lang="pt-BR"
            value={value}
            onChange={onChange}
            readOnly={s.phase !== 'answer'}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
          />
          {s.phase === 'answer' && (
            <>
              <AccentBar onInsert={insert} />
              <button type="submit" className="btn btn--primary btn--block">
                Check <kbd className="kbd">Enter</kbd>
              </button>
            </>
          )}
        </form>

        {feedback && (
          <div role="status" className={`feedback feedback--${feedback.check.result}`}>
            <div className="feedback__head">
              <Icon name={FEEDBACK[feedback.check.result].icon} />
              {FEEDBACK[feedback.check.result].text}
            </div>
            <p className="expected pt" lang="pt-BR">
              {shown.slice(0, hs)}<span className="expected__hl">{shown.slice(hs, he)}</span>{shown.slice(he)}
            </p>
            {feedback.check.note && <p className="note">{feedback.check.note}</p>}
            {conj && verb && <Paradigm verb={verb} tense={conj.tense} asked={conj.prompt} tu={settings.tu} />}
          </div>
        )}
      </div>

      {(feedback || saveFailed) && (
        <footer className="session__foot">
          {saveFailed && (
            <p role="alert" className="notice">
              <Icon name="alert" /> Couldn't save this answer. Retrying…
            </p>
          )}
          {feedback && (
            <>
              <p className="rated">
                Rated {RATING_NAME[feedback.rating]}
                {dueAt !== undefined && ` · next review in ${untilText(dueAt - Date.now())}`}
              </p>
              <button type="button" className="btn btn--ink btn--block" onClick={() => dispatch({ type: 'continue', now: Date.now() })}>
                Continue <kbd className="kbd">Enter</kbd>
              </button>
            </>
          )}
        </footer>
      )}
    </div>
  );
}

function Paradigm({ verb, tense, asked, tu }: { verb: Verb; tense: Tense; asked: Prompt; tu: boolean }) {
  return (
    <div className="paradigm">
      <div className="paradigm__title">
        <span className="pt" lang="pt-BR">{verb.lemma}</span> · <span className="pt" lang="pt-BR">{TENSE_NAMES[tense]}</span>
      </div>
      {promptsFor(tense, tu).map((p) => (
        <div key={p} className={`paradigm__row${p === asked ? ' paradigm__row--asked' : ''}`}>
          <span className="label pt" lang="pt-BR">{PROMPT_PRONOUNS[p].join(' · ')}</span>
          <span className="pt paradigm__form" lang="pt-BR">{alternates(verb.forms[tense][PROMPT_SLOT[p]]!)[0]}</span>
        </div>
      ))}
    </div>
  );
}
