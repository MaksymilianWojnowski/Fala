import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { applyAccentCombo, insertAt } from '../lib/accents';
import { diffSpan } from '../lib/check';
import { loadSentences, type VerbData } from '../lib/data';
import { PROMPT_PRONOUNS, PROMPT_SLOT, TENSE_NAMES, alternates, promptsFor } from '../lib/names';
import { buildSession, placementItems, verbSession, type BuildInput } from '../lib/scheduler';
import { loadVoices, pickVoice, speak } from '../lib/speech';
import {
  commitAnswer, gapParts, gradeRating, reduce, startSession, suspendCard, untilText,
  type SessionAction, type SessionContext, type SessionState,
} from '../lib/session';
import type { CardState, Item, Prompt, Rating, Sentence, Settings, Store, Tense, Verb } from '../lib/types';
import { LEARN } from '../content/learn';
import { UNITS, unitForTense } from '../content/units';
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
  // Undefined means a flag: the card is suspended instead of rated.
  rating?: Rating;
  showDue?: boolean;
  input: string;
  now: number;
  busy?: boolean;
}

interface Props {
  store: Store;
  verbs: VerbData;
  route: { unit?: string; verb?: string; test?: boolean };
  override?: Item[];
  onReview: (items: Item[]) => void;
  onRestart: () => void;
}

export function Session({ store, verbs, route, override, onReview, onRestart }: Props) {
  // A test needs a real unit; without one the route runs as a normal review.
  const testUnit = route.test && route.unit ? UNITS.find((u) => u.id === route.unit) : undefined;
  const [boot, setBoot] = useState<{ before: Map<string, CardState>; settings: Settings; voice?: SpeechSynthesisVoice }>();
  const [s, setS] = useState<SessionState>();
  const [value, setValue] = useState('');
  const [dueAt, setDueAt] = useState<number>();
  const [saveFailed, setSaveFailed] = useState(false);
  // Translate is revealed before it is graded; the reveal is screen state, not part of the reducer.
  const [revealed, setRevealed] = useState(false);
  // Refs let the window key handler and double-fired events read the latest state synchronously.
  const latest = useRef<SessionState | undefined>(undefined);
  const cfg = useRef<{ ctx: SessionContext; settings: Settings } | undefined>(undefined);
  const revealedRef = useRef(false);
  // Answers whose save failed; retried on Continue so none is lost silently.
  const pending = useRef<Pending[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);
  const field = () => inputRef.current ?? areaRef.current;

  // Built once per mount; a key change in App remounts this for a new run.
  useEffect(() => {
    let live = true;
    void (async () => {
      const [cards, units, settings, sentences, voices] = await Promise.all([
        store.cards(), store.units(), store.settings(), loadSentences(), loadVoices(),
      ]);
      const now = Date.now();
      const voice = pickVoice(voices, settings.voice);
      const input: BuildInput = { cards, units, settings, now, verbs: verbs.list, sentences, rng: Math.random, hasVoice: !!voice };
      // A placement test ignores any leftover miss list from an earlier review run.
      const items = testUnit
        ? placementItems(testUnit, verbs.list, settings, Math.random)
        : override ?? (route.verb ? verbSession(route.verb, input) : buildSession(input));
      if (!live) return;
      const first = startSession(items, now, settings.minutes, testUnit ? 'test' : 'review');
      latest.current = first;
      cfg.current = { ctx: { verbs: verbs.byLemma, strictAccents: settings.strictAccents }, settings };
      setS(first);
      setBoot({ before: cards, settings, voice });
    })();
    return () => {
      live = false;
    };
  }, []);

  function save(p: Pending): void {
    if (p.busy) return;
    p.busy = true;
    const write = p.rating === undefined
      ? suspendCard(store, p.item.cardId, p.now)
      : commitAnswer(store, p.item, p.rating, p.input, p.now);
    write.then(
      (c) => {
        pending.current = pending.current.filter((x) => x !== p);
        setSaveFailed(pending.current.length > 0);
        if (p.showDue) setDueAt(+c.fsrs.due);
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
    if (a.type !== 'submit') {
      setValue('');
      setDueAt(undefined);
      revealedRef.current = false;
      setRevealed(false);
      pending.current.forEach(save);
    }
    if (next.mode !== 'review') return;
    const item = prev.items[prev.index];
    if (a.type === 'submit') save({ item, rating: next.last!.rating, showDue: true, input: a.input, now: a.now });
    else if (a.type === 'grade') save({ item, rating: gradeRating(a.got), input: '', now: a.now });
    else if (a.type === 'flag') save({ item, input: '', now: a.now });
  }

  function reveal(): void {
    revealedRef.current = true;
    setRevealed(true);
    // Blur so the 1 / 2 grading keys reach the window instead of the textarea.
    areaRef.current?.blur();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = latest.current;
      if (e.key === 'Escape') location.hash = '#/today';
      else if (e.key === 'Enter' && cur?.phase === 'feedback') {
        // Stops the readonly input's implicit form submit from grading the next item.
        e.preventDefault();
        dispatch({ type: 'continue', now: Date.now() });
      } else if (
        cur?.phase === 'answer' && revealedRef.current && (e.key === '1' || e.key === '2')
        && !(e.target instanceof HTMLTextAreaElement)
      ) {
        dispatch({ type: 'grade', got: e.key === '2', now: Date.now() });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cur = s?.items[s.index];
  // Audio-only gap cards speak the full sentence as soon as they show.
  useEffect(() => {
    if (s?.phase === 'answer' && cur?.kind === 'gap' && cur.hint === 'audio' && boot?.voice) {
      speak(cur.sentence.pt, boot.voice);
    }
  }, [s?.phase, s?.index]);

  useEffect(() => {
    if (s?.phase === 'answer') field()?.focus();
  }, [s?.phase, s?.index]);

  useLayoutEffect(() => {
    const el = field();
    if (caret.current !== null && el) {
      el.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [value]);

  if (!s || !boot) return null;
  if (s.phase === 'done') {
    return (
      <Summary
        state={s} before={boot.before} store={store} verbs={verbs} onReview={onReview}
        testUnit={testUnit} onRestart={onRestart}
      />
    );
  }

  const { settings, voice } = boot;
  const item = s.items[s.index];
  const conj = item.kind === 'conjugate' ? item : undefined;
  const gap = item.kind === 'gap' ? item : undefined;
  const tr = item.kind === 'translate' ? item : undefined;
  const verb = conj && verbs.byLemma.get(conj.lemma);
  const feedback = s.phase === 'feedback' ? s.last : undefined;
  const shown = feedback ? alternates(feedback.expected)[0] : '';
  const [hs, he] = feedback ? diffSpan(feedback.expected, feedback.input) : [0, 0];
  const answering = s.phase === 'answer';
  const canFlag = !!gap || !!tr;

  function onChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
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
    const r = insertAt(value, field()?.selectionStart ?? value.length, ch);
    caret.current = r.caret;
    setValue(r.value);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) dispatch({ type: 'submit', input: value, now: Date.now() });
  }

  const flag = () => dispatch({ type: 'flag', now: Date.now() });
  const listen = (text: string) => voice && speak(text, voice);

  return (
    <div className="session">
      <header className="session__top">
        <a className="icon-btn" href="#/today" aria-label="End session"><Icon name="close" /></a>
        <Bar pct={(s.index / s.items.length) * 100} />
        <span className="muted small">{s.index + 1} / {s.items.length}</span>
      </header>

      <div className="session__body">
        {tr && (
          <>
            <div className="prompt">
              <span className="eyebrow">Translate</span>
              <span className="tr-prompt__en">{tr.sentence.en}</span>
              <p className="muted small">Say it out loud or type it, then reveal.</p>
            </div>

            <form className="answer-form" onSubmit={(e) => { e.preventDefault(); reveal(); }}>
              <label className="label" htmlFor="answer">Your version (optional)</label>
              <textarea
                id="answer"
                ref={areaRef}
                className="answer answer--text"
                lang="pt-BR"
                rows={2}
                value={value}
                onChange={onChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    reveal();
                  }
                }}
                readOnly={revealed}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
              />
              {!revealed && (
                <button type="submit" className="btn btn--primary btn--block">
                  Reveal <kbd className="kbd">Enter</kbd>
                </button>
              )}
            </form>

            {revealed && (
              <div className="card answer-card">
                <div className="row-between">
                  <span className="eyebrow">Answer</span>
                  {voice && (
                    <button type="button" className="listen-btn listen-btn--icon" aria-label="Listen to the answer" onClick={() => listen(tr.sentence.pt)}>
                      <Icon name="listen" size={18} />
                    </button>
                  )}
                </div>
                <p className="pt answer-card__pt" lang="pt-BR">{tr.sentence.pt}</p>
                {!!tr.sentence.alt?.length && (
                  <div className="also">
                    <span className="also__label">Also right</span>
                    {tr.sentence.alt.map((a) => <span key={a} className="pt also__pt" lang="pt-BR">{a}</span>)}
                  </div>
                )}
                <WhyLine sentence={tr.sentence} />
              </div>
            )}
          </>
        )}

        {gap && (
          <>
            <div className="prompt-top">
              <span className="eyebrow">Fill the gap</span>
              <HintChip hint={gap.hint} tense={gap.sentence.gap.tense} />
            </div>
            <div className="gap-block">
              {answering && gap.hint === 'audio' ? (
                voice && (
                  <button type="button" className="listen-btn" onClick={() => listen(gap.sentence.pt)}>
                    <Icon name="listen" size={18} /> Play again
                  </button>
                )
              ) : (
                <>
                  <GapSentence sentence={gap.sentence} filled={feedback ? shown : undefined} />
                  <p className="muted gap-en">{gap.sentence.en}</p>
                  {feedback && voice && (
                    <button type="button" className="listen-btn" onClick={() => listen(gap.sentence.pt)}>
                      <Icon name="listen" size={18} /> Listen
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {conj && (
          <div className="prompt">
            <span className="eyebrow">Conjugate</span>
            <span className="lemma pt" lang="pt-BR">{conj.lemma}</span>
            <div className="chips">
              <Chip accent>{TENSE_NAMES[conj.tense]}</Chip>
              <Chip>{conj.pronoun}</Chip>
            </div>
          </div>
        )}

        {!tr && (
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
              readOnly={!answering}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
            />
            {answering && (
              <>
                <AccentBar onInsert={insert} />
                <button type="submit" className="btn btn--primary btn--block">
                  Check <kbd className="kbd">Enter</kbd>
                </button>
              </>
            )}
          </form>
        )}

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
            {gap && <WhyLine sentence={gap.sentence} />}
          </div>
        )}
      </div>

      {(feedback || revealed || saveFailed) && (
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
          {tr && revealed && (
            <div className="grade-row">
              <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: 'grade', got: false, now: Date.now() })}>
                Missed <kbd className="kbd">1</kbd>
              </button>
              <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: 'grade', got: true, now: Date.now() })}>
                Got it <kbd className="kbd">2</kbd>
              </button>
            </div>
          )}
          {canFlag && (feedback || revealed) && (
            <button type="button" className="flag-btn" aria-label="Flag this sentence" onClick={flag}>
              <Icon name="flag" size={16} /> Flag
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

// The gap as a blank, or as the filled sentence once the answer is shown.
function GapSentence({ sentence, filled }: { sentence: Sentence; filled?: string }) {
  const { before, after } = gapParts(sentence);
  return (
    <p className="pt gap-sentence" lang="pt-BR">
      {filled === undefined ? (
        <>{before}____ <span className="gap-lemma">({sentence.gap.lemma})</span>{after}</>
      ) : (
        <>{before}<span className="expected__hl">{filled}</span>{after}</>
      )}
    </p>
  );
}

function HintChip({ hint, tense }: { hint: 'tense' | 'context' | 'audio'; tense: Tense }) {
  if (hint === 'tense') return <Chip>{TENSE_NAMES[tense]}</Chip>;
  if (hint === 'context') {
    return (
      <span className="chip chip--icon">
        <Icon name="eyeOff" size={15} />Tense hidden
      </span>
    );
  }
  return <span className="chip">Audio only</span>;
}

function WhyLine({ sentence }: { sentence: Sentence }) {
  const tense = sentence.gap.tense;
  const why = sentence.why ?? LEARN[unitForTense(tense).id].why;
  return (
    <p className="note">
      <b>Why <span className="pt" lang="pt-BR">{TENSE_NAMES[tense].toLowerCase()}</span>:</b> {why}
    </p>
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
