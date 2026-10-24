# Fala: design spec

A minimal web app for learning **Brazilian Portuguese grammar**: tenses, verb conjugation and sentences.
Status: approved in conversation on 2026-10-24, waiting for review of this written version.
Mockups: [Fala mockups canvas](https://claude.ai/artifact/7BZibedhaTxhUL8XnNbxwu) (11 screens, clickable in Play mode).

---

## 1. Intent

| | |
|---|---|
| **Who** | One learner (the author) living in Brazil for 3 months. Learned mostly through conversation, so the level is uneven: good at speaking, with gaps in grammar. May publish the app later. |
| **Problem** | Duolingo is shallow on grammar: you click instead of producing answers, and mistakes come with no explanations. Good alternatives are paid. |
| **Outcome** | A daily 10-minute habit that makes verb forms and tense choice automatic, in the Portuguese people actually speak in Brazil. |
| **Constraints** | Free to run ($0). English UI. Minimal, with no distractions. Works on phone and laptop equally, with progress synced between them. |

### Success criteria
1. You open the app, press **Start**, and finish a 10-minute session using only the keyboard (laptop) or your thumbs (phone).
2. After a session on the phone, the laptop shows the same due counts within a minute of opening.
3. Every wrong answer shows the correct form, the full conjugation row and a one-line "why".
4. Data integrity: every required person slot of 150 verbs × 14 tenses is filled, and pipeline asserts pass.
5. Two weeks of daily use without needing another app for grammar practice.

### Assumptions (confirmed)
- Brazilian Portuguese only. No *vós*. *tu* is an optional setting. *a gente* is a first-class person.
- Spoken forms come first, marked as such (*vou falar* before *falarei*, *tinha falado* before *falara*).
- Answers are typed, not picked. Self-grading only for free translation.
- No AI in v1. No accounts in v1.

---

## 2. Research: what the best apps do, and what Fala takes

| App | Strength | Fala takes | Fala skips |
|---|---|---|---|
| **Anki** | Spaced repetition. FSRS is the best open scheduler. | FSRS via `ts-fsrs` (MIT) | Manual card authoring, ugly UI |
| **Clozemaster** | Thousands of real sentences with a gap; you must infer from context | Fill-the-gap from Tatoeba, tense hidden once you know the form | Gamified points, mixed PT-PT/PT-BR content |
| **Conjuguemos / Verbare** | Fast typed conjugation drills, accent buttons | Conjugate drill, accent bar, keyboard shortcuts | Paywall for tenses, ads |
| **Language Transfer** | Explains *why*; builds patterns instead of lists | One-line "why" after every miss, contrast units (perfeito vs imperfeito) | Audio-only course format |
| **Glossika / Pimsleur** | Whole sentences, said out loud, spaced | Translate exercise: say it, reveal, self-grade; audio on every sentence | Paid subscription |
| **Duolingo** | Habit loop (one tap to start, streak) | One big Start button, a quiet streak | Hearts, XP, leagues, mascots, picking answers from tiles |

**The two ideas that matter most**
1. **Production beats recognition.** Typing *fizemos* trains recall. Picking it from four options trains only recognition.
2. **Tense choice is the real skill.** Knowing *falava* is not enough. You must know *when*. That is why fill-the-gap hides the tense name once the form is stable.

---

## 3. Learning model

### 3.1 Path: 16 units in 4 stages
Ordered by how often each tense is heard in spoken Brazilian Portuguese. Every unit is open at any time, so the path is a recommendation, not a lock.

| Stage | Units |
|---|---|
| 1 · Core | Presente regular · Presente irregular · Future with *ir* (spoken) · Estar + gerúndio |
| 2 · Past | Pretérito perfeito · Imperfeito · Perfeito vs. imperfeito (contrast, no new forms) · Mais-que-perfeito composto (spoken) |
| 3 · Moods | Imperativo · Futuro do pretérito · Presente do subjuntivo |
| 4 · Advanced | Imperfeito do subjuntivo · Futuro do subjuntivo · Pretérito perfeito composto · Futuro simples (written) · Infinitivo pessoal |

### 3.2 Tenses (14 conjugation tables)
`pres` · `perf` · `imperf` · `mqp_comp` (ter imperf + particípio) · `fut_ir` (ir pres + infinitivo) · `fut` · `cond` · `prog` (estar pres + gerúndio) · `perf_comp` (ter pres + particípio) · `imp` · `subj_pres` · `subj_imperf` · `subj_fut` · `inf_pess`

- The negative imperative uses `subj_pres` forms. This is taught on the Imperativo Learn page, not stored as a separate table.
- `perf_comp` gets a warning: *tenho falado* means "I've been speaking (lately)", not "I have spoken".

### 3.3 Persons
Data is stored per grammatical slot: `eu`, `tu`, `ele`, `nos`, `eles`.
Prompts use the pronouns people actually say, mapped to slots:

| Prompt | Slot |
|---|---|
| eu | eu |
| você, ele, ela, **a gente** | ele |
| nós | nos |
| vocês, eles, elas | eles |
| tu (only if enabled) | tu |

Prompting *a gente* separately trains the very common "a gente **fala**" pattern.

### 3.4 Cards
| Card | Id | Exercise | Source |
|---|---|---|---|
| Conjugation | `c:{lemma}:{tense}` | Conjugate | verbs.json |
| Sentence gap | `s:{sentenceId}` | Fill the gap | sentences.json |
| Translation | `t:{sentenceId}` | Translate | curated + sentences.json |

- One conjugation card covers a whole verb × tense. Each review picks one person, weighted toward persons you miss: `weight = 1 − accuracy + 0.2`.
- Limits: about 150 verbs × 14 tenses = 2,100 conjugation cards. Only cards from units you started or passed are active.
- **Unlock order (form → context → production):**
  1. Conjugation cards enter as new cards.
  2. The gap cards for a lemma × tense unlock after its conjugation card has one passing review (Good or Hard).
  3. A sentence's translate card unlocks after its gap card has two passing reviews.
- The new-cards-per-day cap applies to all three types combined.

### 3.5 Exercises
1. **Conjugate.** Shows lemma, tense and person, and you type the form.
2. **Fill the gap.** Shows a sentence with the verb removed and the infinitive in brackets. The difficulty rises automatically with the card's FSRS stability:
   - stability < 3 days: tense name shown
   - 3 to 21 days: tense hidden, so you infer it from context
   - over 21 days: audio only (if a pt-BR voice exists)
3. **Translate.** Shows an English sentence. You say or type the Portuguese, reveal the answer (with accepted variants marked *spoken*), then self-grade `Missed` (key 1) or `Got it` (key 2).

### 3.6 Checking answers
`check(input, expected, table) → { result: 'correct' | 'accent' | 'wrong', note? }`
1. Normalize both sides: NFC, trim, lowercase, collapse spaces, strip trailing punctuation.
2. Equal → `correct`.
3. Equal after stripping diacritics → `accent`.
4. Otherwise `wrong`. If the input matches another cell of the same verb's table, the note says so: "*fazemos* is presente".

| Result | FSRS rating |
|---|---|
| correct | Good |
| accent | Hard (Again if **Strict accents** is on) |
| wrong | Again |

### 3.7 Feedback after a miss
- Correct form, with the changed part highlighted (the irregular stem or the accent).
- The full row for that verb × tense, with the asked person highlighted.
- One "why": the sentence's own `why` if curated, otherwise the tense's one-line rule.
- When it comes back, e.g. "Rated Again · back in 10 minutes".
- Sentence cards also have a small **Flag** action. It suspends the card and logs it locally (for bad tagging or translations).

### 3.8 Session
- Length setting: 5, 10 or 20 minutes, at about 15 to 20 s per card (10 min ≈ 30 to 40 cards). A session stops at the chosen length, and leftover cards stay due.
- Order: due cards by due date first, then up to **10 new cards/day** (setting) from started units, in path order.
- Exercise mix within a session comes from the card types that are due. No separate modes.
- End screen: correct / almost / missed counts, units that moved up, misses coming back, tomorrow's due count.
- No hearts, XP or mascots. The streak is a small text line and can be turned off.

### 3.9 Placement ("Test me")
- 6 items from the unit (top 30 verbs, random persons).
- 5 or more correct marks the unit as **Known**: all its cards are created with one `Good` review, so they start days out instead of in learning steps.
- Fewer than 5 offers "Start learning". There is no penalty either way.

---

## 4. Screens

All screens are on the mockup canvas. Navigation has 4 tabs: **Today · Path · Progress · Verbs**, with Settings behind an icon on Today.

| Screen | Purpose | Key elements |
|---|---|---|
| Today | Start the day's session | Due/new count, minutes, **Start session**, current unit card (Learn / Practice), 3 weak spots, streak line |
| Session: Conjugate | Typing a form | Progress bar, ×, lemma (serif, large), tense + person chips, input, accent bar, **Check** |
| Session: Feedback | After a miss | Struck-through answer, correct form, note, paradigm row, rating line, **Continue** |
| Session: Fill the gap | Sentence cloze | "Tense hidden" chip, sentence, English below, Listen, input, Almost/Wrong panel with why |
| Session: Translate | Free production | English prompt, optional input, answer + accepted variants, **Missed / Got it** |
| Summary | Visible win | Counts, units moved up, misses coming back, **Review misses now / Done** |
| Path | Choose what to learn | 4 stages, status per unit (Known / % / New), **Test me** on new units, spoken/written tags |
| Learn | Short lesson per unit | Summary, 3 uses with examples, signal words, endings table, 5 irregulars, audio example, **Test me / Start learning** |
| Progress | Where am I weak | 3 stat tiles, tense × person heatmap with numbers in cells, one insight line, hardest verbs |
| Verbs | Look up any verb | Search (lemma or any form), meaning, participle/gerund, tense cards with irregular forms highlighted, **Practice {verb}** |
| Settings | Preferences | Session length, new/day, include *tu*, strict accents, voice, theme, streak on/off, sync code, About (data attributions) |

Laptop: same screens, content column max 640 px, sessions keyboard-only:
`Enter` check/continue · `Esc` end session · `1`/`2` self-grade (after reveal, when focus leaves the text field) · `a'`→á `a^`→â `a~`→ã `` a` ``→à `e'`→é `e^`→ê `i'`→í `o'`→ó `o^`→ô `o~`→õ `u'`→ú `c,`→ç (in answer fields only, toggle in Settings).

### 4.1 Visual system
- **Style:** Swiss minimal. Flat, 1 px borders, no shadows, no gradients, one accent.
- **Type:** Inter (UI, 400/500/600) and Newsreader (all Portuguese text, 400/500 + italic). Both are self-hosted woff2 files, so offline works.
- **Shape:** radius 12 to 16 px, touch targets at least 44 px, focus ring = 2 px accent border + 4 px soft halo.
- **Motion:** 150 ms opacity/transform only, disabled under `prefers-reduced-motion`.
- **States:** never color alone. Each state has an icon and a text label ("Not quite", "Almost · check the accent").

| Token | Light | Dark |
|---|---|---|
| `--bg` | #FAFAF7 | #141413 |
| `--surface` | #FFFFFF | #1D1D1B |
| `--ink` | #1A1A18 | #F2F1EC |
| `--ink-2` | #3D3D3A | #D6D5CF |
| `--muted` | #5F5F5A | #A3A29C |
| `--line` | #E6E5E0 | #2E2E2B |
| `--accent` | #0F766E | #2DD4BF |
| `--accent-soft` | #E7F1EF | #12302C |
| `--warn` / soft | #92400E / #FDF3E2 | #F5B454 / #33260F |
| `--bad` / soft | #B42318 / #FBEDEB | #F28B7F / #3A1A17 |

Theme follows the system by default, with a manual override in Settings.

---

## 5. Data

### 5.1 Sources and licenses
| Data | Source | License | Use |
|---|---|---|---|
| Verb frequency | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) `pt_br` (OpenSubtitles 2018) | CC-BY-SA 4.0 | Rank verbs, pick top 150 |
| Conjugations | [verbecc](https://github.com/bretttolbert/verbecc) | LGPL-3.0 (tool, run at build time) | Generate all tables |
| Conjugation check | English Wiktionary via [kaikki.org](https://kaikki.org/dictionary/Portuguese/) | CC-BY-SA | Cross-check generated forms |
| Sentences + EN translations | [Tatoeba](https://tatoeba.org/downloads) per-language exports | CC-BY 2.0 FR | Fill the gap and Translate cards |
| Tense tagging | spaCy `pt_core_news_lg` | (tool, build time) | Lemma, tense, mood, person per verb token |
| Audio | Web Speech API pt-BR voice | System voices | Listen buttons |
| Hand-written content | This repo | Own | Learn pages, why rules, contrast sentences |

An **About** screen lists all attributions (required by CC-BY and CC-BY-SA).

### 5.2 Pipeline (`pipeline/`, Python, run by hand, output committed)
`python pipeline/build.py` writes `src/data/verbs.json` and `src/data/sentences.json`.

1. **Verbs.** Lemmatize the frequency list with spaCy, keep `VERB` lemmas, take the top 150, and merge in any irregular verb the Learn pages reference.
2. **Tables.** Run verbecc for each verb × simple tense. Drop `vós`. Normalize PT-PT spellings (e.g. perfeito *falámos* → *falamos*). Build compound tenses from auxiliaries and the participle/gerund. Mark each form `irregular` if it differs from the regular-rule output for that verb's class.
3. **Cross-check.** Compare against Wiktionary forms. Write every mismatch to `pipeline/review.csv` for manual decision. The build fails if review.csv has unresolved rows.
4. **Sentences.** Load Tatoeba `por` sentences linked to `eng`. Keep 3 to 14 tokens. Drop PT-PT markers (`autocarro`, `comboio`, `telemóvel`, `pequeno-almoço`, `rapariga`, `facto`, `equipa`, `ecrã`, `casa de banho`, `frigorífico`, regex `estar a + infinitive`, subject `vós`, `-ámos` perfeito, 2nd-person-singular verb forms).
5. **Tagging.** For each sentence, find verb tokens whose lemma is in the verb list. Map spaCy morphology to a tense id (detect compound tenses by auxiliary + `VerbForm`). Pick one gap per sentence. A compound gap covers aux + main verb.
6. **Cap and dedupe.** At most 30 sentences per lemma × tense. Keep Tatoeba id + author for attribution.
7. **Asserts.** Known forms must match: *fazer perf nós = fizemos*, *pôr perf ele = pôs*, *ser imperf eu = era*, *ir subj_fut eles = forem*, *ter mqp_comp eu = tinha tido*, *falar inf_pess nós = falarmos*.

### 5.3 App data shapes
```ts
type Tense = 'pres'|'perf'|'imperf'|'mqp_comp'|'fut_ir'|'fut'|'cond'|'prog'
           |'perf_comp'|'imp'|'subj_pres'|'subj_imperf'|'subj_fut'|'inf_pess';
type Slot = 'eu'|'tu'|'ele'|'nos'|'eles';

interface Verb {                      // verbs.json
  lemma: string; en: string; rank: number;
  participle: string; gerund: string;
  forms: Record<Tense, Partial<Record<Slot, string>>>;  // imp has no 'eu'
  irregular: string[];                // e.g. ["perf.eu", "pres.eu"]
}

interface Sentence {                  // sentences.json
  id: number; pt: string; en: string; author: string;
  gap: { start: number; end: number; lemma: string; tense: Tense; slot: Slot };
  alt?: string[];                     // accepted variants (curated only)
  why?: string;                       // curated only
}

interface Unit {                      // src/content/units.ts, hand-written
  id: string; stage: 1|2|3|4; name: string; example: string;
  tags: ('spoken'|'written')[];
  tenses: Tense[]; verbs?: string[];  // verbs limits the unit, e.g. irregular presente
  learn: { summary: string; uses: {title: string; pt: string; en: string}[];
           signals: string[]; irregulars: {verb: string; forms: string}[];
           examples: {pt: string; en: string}[]; note?: string };
  contrast?: Sentence[];              // curated contrast sets
}
```

### 5.4 User state (IndexedDB via `idb-keyval`)
```ts
interface CardState { id: string; fsrs: FsrsCard; updatedAt: number;
                      suspended?: boolean; slots?: Record<Slot, [ok: number, total: number]> }
interface ReviewLog { id: string; cardId: string; at: number; rating: 1|2|3|4;
                      answer?: string; device: string }
interface Settings  { minutes: 5|10|20; newPerDay: number; tu: boolean; strictAccents: boolean;
                      voice?: string; theme: 'system'|'light'|'dark'; streak: boolean;
                      syncCode?: string; updatedAt: number }
interface UnitState { id: string; status: 'new'|'learning'|'known'; updatedAt: number }
```
Call `navigator.storage.persist()` on first run.

---

## 6. Architecture

```
Fala/
  index.html, vite.config.ts, package.json
  src/
    main.tsx, app.tsx            # hash routing: #/today #/path #/learn/:unit #/progress #/verbs/:lemma #/session #/settings
    styles/tokens.css, base.css
    lib/check.ts                 # answer checking (pure)
    lib/scheduler.ts             # ts-fsrs wrapper, session builder, slot weighting
    lib/store.ts                 # idb-keyval read/write
    lib/sync.ts                  # merge (pure) + fetch to worker
    lib/speech.ts                # Web Speech: pick pt-BR voice, speak()
    lib/accents.ts               # a' → á input transform
    screens/*.tsx                # one file per screen
    content/units.ts             # hand-written units
    data/verbs.json, sentences.json   # generated
  pipeline/                      # Python build scripts + review.csv
  worker/                        # Cloudflare Worker for sync
  docs/
```

- **Dependencies:** `react`, `react-dom`, `ts-fsrs`, `idb-keyval`, `vite-plugin-pwa`. Dev: `vite`, `typescript`, `vitest`. Nothing else.
- **PWA:** app shell, fonts and both data files are precached, so the app works fully offline after the first load.
- **Hosting:** Cloudflare Pages (static) + Cloudflare Worker with KV (sync). Free tier.
- **Speech:** if no `pt-BR` voice is available, Listen buttons are hidden and audio-only gaps are skipped.

### 6.1 Sync
- **Code:** 128-bit random, base64url (22 chars), created on the first device. Entered on the second device, or opened as a link `…/#/settings?sync=CODE`.
- **Worker:** `GET /v1/state/:code` and `PUT /v1/state/:code`. It validates the code format, limits the body to 5 MB and requires valid JSON. CORS is restricted to the app origin. It stores one JSON blob per code.
- **Client:** sync on app open, after each session, and every 5 minutes while open. Steps: `GET` → `merge(local, remote)` → save local → `PUT` merged.
- **Merge (pure function):**
  - cards and units: per id, the larger `updatedAt` wins
  - logs: union by id
  - settings: larger `updatedAt` wins
- **Convergence:** two simultaneous PUTs can drop one update on the server, but the local copy keeps it, so the next sync restores it.
- **Security:** the code is a bearer secret. That is acceptable for non-sensitive progress data and a single user. Before publishing, it must be replaced by real accounts.

---

## 7. Testing

| What | How |
|---|---|
| `check.ts` | Vitest: correct, accent-only, wrong, other-tense note, `tu` toggle, punctuation and case |
| `sync.ts` merge | Vitest: newer card wins, log union, idempotence `merge(a, merge(a, b)) == merge(a, b)`, commutativity on cards |
| `scheduler.ts` | Vitest: due-first order, new-card cap, placement creates Good reviews, slot weighting favors misses |
| `accents.ts` | Vitest: each combo, no transform outside answer fields |
| Data | Vitest: every verb × tense × required slot is non-empty; every sentence gap slices to a form in its verb's table |
| Pipeline | Python asserts (§5.2 step 7), build fails on unresolved review.csv |
| UI | Manual check on phone and laptop before each milestone is called done |

---

## 8. Milestones

| # | Scope | Done when | Estimate |
|---|---|---|---|
| 1 | Scaffold, tokens, verbs pipeline (stages 1 and 2 tenses), Conjugate + Feedback, FSRS, IndexedDB, Today | You can do a real conjugation session on the laptop | 1 day |
| 2 | All 14 tenses, units.ts with Learn content, Path, Learn, placement | All 16 units open and testable | 1 day |
| 3 | Sentence pipeline, Fill the gap, Translate, speech, Flag button | Sessions mix all 3 exercise types | 1 day |
| 4 | Progress, Verbs, Settings, sync worker, PWA, deploy | Same progress on phone and laptop, installed as an app | 1 day |

---

## 9. Out of scope for v1
Accounts · AI features (planned v2: "Check my sentence" with your own API key) · speech recognition · vocabulary decks · XP, leagues, notifications · European Portuguese · FSRS parameter optimization · pre-recorded audio (Piper TTS).

## 10. Risks
| Risk | Mitigation |
|---|---|
| spaCy mislabels a tense, so a gap teaches the wrong thing | Hardest units use curated contrast sets; **Flag** suspends a card in one tap |
| verbecc output follows PT-PT conventions | Normalization step + Wiktionary cross-check + review.csv gate |
| Device has no pt-BR voice | Listen hidden, audio-only gaps skipped; Piper audio in v2 |
| Safari clears storage of non-installed sites after 7 days unused | Install as PWA, `storage.persist()`, sync acts as backup |
| Sync code leaks | Only progress data is exposed. Accounts required before publishing |

## 11. Sources
- Tatoeba downloads and license: https://tatoeba.org/ca/downloads
- Tatoeba PT-BR tagging (about 150 variant-tagged sentences out of 400k+): https://forum.clozemaster.com/t/is-the-portuguese-used-in-clozemaster-european-or-brazilian/29790
- kaikki.org Portuguese (Wiktionary extract): https://kaikki.org/dictionary/Portuguese/meaning/f/fa/faz.html
- verbecc: https://github.com/bretttolbert/verbecc
- ts-fsrs: https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/README.md
- FrequencyWords: https://github.com/hermitdave/FrequencyWords
- Piper voices: https://github.com/tiiuae/piper
- UD Porttinari (Brazilian treebank, CC BY 4.0, a possible future source of tagged sentences): https://universaldependencies.org/treebanks/pt_porttinari
- Verbare (reference conjugation app): https://apps.apple.com/us/app/-/id6757960069
