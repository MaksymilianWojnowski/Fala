"""Brazilian Portuguese sentence filter and verb-gap finder. Pure: spaCy tokens are converted to Tok upstream."""
from __future__ import annotations

import re
from dataclasses import dataclass

PT_PT_WORDS = {'autocarro', 'comboio', 'telemóvel', 'pequeno-almoço', 'rapariga', 'facto', 'equipa', 'ecrã',
               'frigorífico'}
PT_PT_PHRASES = ['casa de banho']
PT_PT_RE = re.compile(r'\b(?:' + '|'.join(re.escape(w) for w in sorted(PT_PT_WORDS)) + r')\b')
ESTAR_A_INF = re.compile(r'\best(?:ou|ás|á|amos|ão|ava|avam|ávamos|ar)\s+a\s+\w+r\b')
VOS = re.compile(r'\bvós\b')
PT_PT_PAST_1PL = re.compile(r'\w+ámos\b')
SLOT_BY_PERSON_NUMBER = {('1', 'Sing'): 'eu', ('2', 'Sing'): 'tu', ('3', 'Sing'): 'ele', ('1', 'Plur'): 'nos',
                         ('3', 'Plur'): 'eles'}
# (aux lemma, aux Tense, verb VerbForm) -> compound tense
COMPOUND = {('ter', 'Imp', 'Part'): 'mqp_comp', ('ter', 'Pres', 'Part'): 'perf_comp',
            ('estar', 'Pres', 'Ger'): 'prog', ('ir', 'Pres', 'Inf'): 'fut_ir'}


def is_br(text: str) -> bool:
    t = text.lower()
    if PT_PT_RE.search(t) or any(p in t for p in PT_PT_PHRASES):
        return False
    return not (ESTAR_A_INF.search(t) or VOS.search(t) or PT_PT_PAST_1PL.search(t))


def length_ok(text: str) -> bool:
    return 3 <= len(text.split()) <= 14


@dataclass
class Tok:
    i: int
    text: str
    lemma: str
    pos: str
    morph: dict[str, str]
    dep: str
    head: int
    idx: int


def simple_tense(morph: dict[str, str]) -> str | None:
    mood, tense = morph.get('Mood'), morph.get('Tense')
    if mood == 'Imp':
        return 'imp'
    if mood == 'Cnd':
        return 'cond'
    if mood == 'Ind':
        return {'Pres': 'pres', 'Past': 'perf', 'Imp': 'imperf', 'Fut': 'fut'}.get(tense)
    if mood == 'Sub':
        return {'Pres': 'subj_pres', 'Imp': 'subj_imperf', 'Fut': 'subj_fut'}.get(tense)
    if morph.get('VerbForm') == 'Inf' and 'Person' in morph:
        return 'inf_pess'
    return None


def slot_of(morph: dict[str, str]) -> str | None:
    return SLOT_BY_PERSON_NUMBER.get((morph.get('Person'), morph.get('Number')))


def alternates(cell: str) -> list[str]:
    return cell.split('|')


def _candidate(verb: Tok, by_i: dict[int, Tok]):
    """Return (tense, slot, start, end, span) for a verb token, or None."""
    aux = by_i.get(verb.i - 1)
    if aux is not None and aux.dep == 'aux' and aux.head == verb.i:
        tense = COMPOUND.get((aux.lemma, aux.morph.get('Tense'), verb.morph.get('VerbForm')))
        if tense is not None:
            return tense, slot_of(aux.morph), aux.idx, verb.idx + len(verb.text), f'{aux.text} {verb.text}'
    tense, slot = simple_tense(verb.morph), slot_of(verb.morph)
    if tense is None or slot is None:
        return None
    return tense, slot, verb.idx, verb.idx + len(verb.text), verb.text


def find_gap(toks: list[Tok], verbs: dict[str, dict]) -> dict | None:
    if any(t.pos in ('VERB', 'AUX') and t.morph.get('Person') == '2' and t.morph.get('Number') == 'Sing'
           for t in toks):
        return None
    by_i = {t.i: t for t in toks}
    for verb in toks:
        if verb.pos != 'VERB' or verb.lemma not in verbs:
            continue
        found = _candidate(verb, by_i)
        if found is None:
            continue
        tense, slot, start, end, span = found
        forms = verbs[verb.lemma]['forms']
        span = span.lower()
        cell = (forms.get(tense) or {}).get(slot)
        if cell is None or span not in alternates(cell):
            continue
        ambiguous = any(span in alternates(forms[t][slot]) for t in forms
                        if t != tense and forms[t].get(slot) is not None)
        if ambiguous:
            continue
        return {'start': start, 'end': end, 'lemma': verb.lemma, 'tense': tense, 'slot': slot}
    return None
