"""Brazilian Portuguese conjugation tables built from verbecc."""
import json
import logging
from functools import lru_cache

from verbecc import CompleteConjugator, LangCodeISO639_1 as Lang

logging.getLogger('verbecc').setLevel(logging.WARNING)

# Same ids and order as TENSES in src/lib/names.ts.
TENSES = ['pres', 'perf', 'imperf', 'mqp_comp', 'fut_ir', 'fut', 'cond', 'prog', 'perf_comp', 'imp',
          'subj_pres', 'subj_imperf', 'subj_fut', 'inf_pess']
SLOTS = ['eu', 'tu', 'ele', 'nos', 'eles']
VERBECC_MAP = {'pres': ('indicativo', 'presente'), 'perf': ('indicativo', 'pretérito-perfeito'),
               'imperf': ('indicativo', 'pretérito-imperfeito'), 'fut': ('indicativo', 'futuro-do-presente'),
               'cond': ('condicional', 'futuro-do-pretérito'), 'imp': ('imperativo', 'afirmativo'),
               'subj_pres': ('subjuntivo', 'presente'), 'subj_imperf': ('subjuntivo', 'pretérito-imperfeito'),
               'subj_fut': ('subjuntivo', 'futuro'), 'inf_pess': ('infinitivo', 'infinitivo-pessoal-presente')}
PRONOUN_SLOT = {'eu': 'eu', 'tu': 'tu', 'ele': 'ele', 'você': 'ele', 'nós': 'nos', 'eles': 'eles', 'vocês': 'eles'}
IMP_SLOTS = ('ele', 'nos', 'eles')
CONNECTIVES = {'que', 'se', 'quando', 'por', 'não'}
MODELS = {'ar': 'falar', 'er': 'comer', 'ir': 'partir'}


def strip_pronoun(c: str, pr: str) -> str:
    return ' '.join(t for t in c.split() if t != pr and t not in CONNECTIVES)


def normalize_br(tense: str, slot: str, form: str) -> str:
    # verbecc returns PT-PT accents in the perfeito nós form.
    if tense == 'perf' and slot == 'nos':
        return form.replace('ámos', 'amos')
    return form


@lru_cache(maxsize=None)
def _conjugator() -> CompleteConjugator:
    return CompleteConjugator(Lang.pt)


def _raw(lemma: str) -> dict:
    return json.loads(_conjugator().conjugate(lemma).to_json())


def _cells(entries: list, tense: str) -> dict:
    out = {}
    for e in entries:
        pr = e.get('pr')
        if pr not in PRONOUN_SLOT or e['c'] == ['-']:
            continue
        slot = PRONOUN_SLOT[pr]
        if tense == 'imp' and slot not in IMP_SLOTS:
            continue
        if slot in out:  # você and ele share a slot; keep the first
            continue
        out[slot] = '|'.join(normalize_br(tense, slot, strip_pronoun(c, pr)) for c in e['c'])
    return out


@lru_cache(maxsize=None)
def simple_forms(lemma: str) -> dict:
    data = _raw(lemma)
    moods = data['moods']
    forms = {t: _cells(moods[mood][vt], t) for t, (mood, vt) in VERBECC_MAP.items()}
    return {
        'forms': forms,
        'participle': moods['particípio']['particípio'][0]['c'][0],
        'gerund': moods['gerúndio']['gerúndio'][0]['c'][0],
        'predicted': data['verb']['predicted'],
    }


def compound(ter: dict, estar: dict, ir: dict, lemma: str, participle: str, gerund: str) -> dict:
    alts = participle.split('|')
    return {
        'mqp_comp': {s: '|'.join(f"{ter['imperf'][s]} {p}" for p in alts) for s in ter['imperf']},
        'perf_comp': {s: '|'.join(f"{ter['pres'][s]} {p}" for p in alts) for s in ter['pres']},
        'prog': {s: f"{estar['pres'][s]} {gerund}" for s in estar['pres']},
        'fut_ir': {s: f"{ir['pres'][s]} {lemma}" for s in ir['pres']},
    }


def _model(lemma: str):
    if lemma.endswith(('por', 'pôr')):
        return None
    return MODELS.get(lemma[-2:])


def irregular_cells(lemma: str, forms: dict, participle: str) -> list[str]:
    model = _model(lemma)
    if model is None:  # pôr and -por verbs: no regular model, so every cell is irregular
        return [f'{t}.{s}' for t in forms for s in forms[t]] + ['participle']
    stem, mstem = lemma[:-2], model[:-2]
    mforms = simple_forms(model)['forms']
    out = []
    for t in VERBECC_MAP:
        for s, form in forms[t].items():
            mform = mforms[t].get(s)
            if mform is None:
                continue
            m = mform.split('|')[0]
            expected = stem + m[len(mstem):] if m.startswith(mstem) else None
            if form.split('|')[0] != expected:
                out.append(f'{t}.{s}')
    p_end = 'ado' if lemma.endswith('ar') else 'ido'
    p_irr = participle.split('|')[0] != stem + p_end
    if p_irr:
        out.append('participle')
        out += [f'{t}.{s}' for t in ('mqp_comp', 'perf_comp') for s in forms[t]]
    return out


@lru_cache(maxsize=None)
def conjugate(lemma: str) -> dict:
    base = simple_forms(lemma)
    participle, gerund = base['participle'], base['gerund']
    aux = [simple_forms(x)['forms'] for x in ('ter', 'estar', 'ir')]
    forms = {**base['forms'], **compound(*aux, lemma, participle, gerund)}
    forms = {t: forms[t] for t in TENSES}
    return {
        'lemma': lemma,
        'participle': participle,
        'gerund': gerund,
        'forms': forms,
        'irregular': irregular_cells(lemma, forms, participle),
        'predicted': base['predicted'],
    }
