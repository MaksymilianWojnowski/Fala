"""Brazilian Portuguese sentence filter and verb-gap finder. Pure: spaCy tokens are converted to Tok upstream."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

PT_PT_WORDS = {'autocarro', 'comboio', 'telemóvel', 'pequeno-almoço', 'pequenos-almoços', 'rapariga', 'facto',
               'equipa', 'ecrã', 'frigorífico'}
PT_PT_PHRASES = ['casa de banho', 'casas de banho']
PT_PT_RE = re.compile(r'\b(?:' + '|'.join(re.escape(w) for w in sorted(PT_PT_WORDS | {'telemóveis'}))
                      + r')(?:s|es)?\b')
TU_VOS_RE = re.compile(r'\b(?:vos|vosso|vossa|vossos|vossas|teu|tua|teus|tuas|contigo|ti)\b')  # R24: no vós, no tu
INF = r'(?:\w+r(?:-\w+)?|\w+ê-\w+)'  # fazer, pôr, dar-lhe, fazê-lo
ESTAR_A_INF = re.compile(r'\best(?:ou|ás|á|amos|ão|ava\w*|ávamos|iv\w*|eve\w*|ej\w*|ar\w*|ará|ando|aria\w*)'
                         r'\s+a\s+' + INF + r'\b')
VOS = re.compile(r'\bvós\b')
PT_PT_PAST_1PL = re.compile(r'\w+ámos\b')
SLOT_BY_PERSON_NUMBER = {('1', 'Sing'): 'eu', ('2', 'Sing'): 'tu', ('3', 'Sing'): 'ele', ('1', 'Plur'): 'nos',
                         ('3', 'Plur'): 'eles'}
# (aux lemma, aux Tense, verb VerbForm) -> compound tense
COMPOUND = {('ter', 'Imp', 'Part'): 'mqp_comp', ('ter', 'Pres', 'Part'): 'perf_comp',
            ('estar', 'Pres', 'Ger'): 'prog', ('ir', 'Pres', 'Inf'): 'fut_ir'}


def nfc(text: str) -> str:
    return unicodedata.normalize('NFC', text)


def is_br(text: str) -> bool:
    t = nfc(text).lower()
    if PT_PT_RE.search(t) or any(p in t for p in PT_PT_PHRASES):
        return False
    return not (ESTAR_A_INF.search(t) or VOS.search(t) or PT_PT_PAST_1PL.search(t) or TU_VOS_RE.search(t))


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


# imp and subj_pres share the same 2nd-form cells; syntax decides between them (see _trigger/_initial).
PAIR = {'subj_pres': 'imp', 'imp': 'subj_pres'}
SUBORDINATORS = {'que', 'talvez', 'embora', 'caso'}  # 'para que', 'antes que', 'até que', 'sem que' end in que


def _candidate(verb: Tok, by_i: dict[int, Tok]):
    """Return (tense, morph_slot, start, end, span) for a verb token, or None. morph_slot may be None."""
    aux = by_i.get(verb.i - 1)
    if aux is not None and aux.dep == 'aux' and aux.head == verb.i:
        tense = COMPOUND.get((aux.lemma, aux.morph.get('Tense'), verb.morph.get('VerbForm')))
        if tense is not None:
            return tense, slot_of(aux.morph), aux.idx, verb.idx + len(verb.text), f'{aux.text} {verb.text}'
    tense = simple_tense(verb.morph)
    if tense is None:
        return None
    return tense, slot_of(verb.morph), verb.idx, verb.idx + len(verb.text), verb.text


def _trigger(verb: Tok, by_i: dict[int, Tok]) -> bool:
    """A subordinator precedes the verb in its clause, or the verb has a mark child."""
    if any(t.dep == 'mark' and t.head == verb.i for t in by_i.values()):
        return True
    words, j = [], verb.i - 1
    while j in by_i and by_i[j].pos != 'PUNCT':
        words.append(by_i[j].text.lower())
        j -= 1
    return any(w in SUBORDINATORS for w in words)


def _initial(verb: Tok, by_i: dict[int, Tok]) -> bool:
    """The verb opens its clause, or comes right after 'não'."""
    prev = by_i.get(verb.i - 1)
    return prev is None or prev.pos == 'PUNCT' or prev.text.lower() == 'não'


def _slot_for(tense: str, morph_slot: str | None, verb: Tok, by_i: dict[int, Tok], forms: dict) -> str | None:
    """When eu and ele share a cell, the overt subject decides; otherwise the morphology does."""
    cells = forms.get(tense) or {}
    eu, ele = cells.get('eu'), cells.get('ele')
    if eu and ele and set(alternates(eu)) & set(alternates(ele)):
        subj = [t for t in by_i.values() if t.dep == 'nsubj' and t.head == verb.i]
        if not subj:
            return None
        return 'eu' if subj[0].text.lower() == 'eu' else 'ele'
    return morph_slot


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
        tense, morph_slot, start, end, span = found
        forms = verbs[verb.lemma]['forms']
        span = span.lower()
        if tense in PAIR:
            if _trigger(verb, by_i):
                tense = 'subj_pres'
            elif _initial(verb, by_i):
                tense = 'imp'
            else:
                continue
        slot = _slot_for(tense, morph_slot, verb, by_i, forms)
        if slot is None:
            continue
        cell = (forms.get(tense) or {}).get(slot)
        if cell is None or span not in alternates(cell):
            continue
        partner = PAIR.get(tense)
        ambiguous = any(span in alternates(forms[t][slot]) for t in forms
                        if t not in (tense, partner) and forms[t].get(slot) is not None)
        if ambiguous:
            continue
        return {'start': start, 'end': end, 'lemma': verb.lemma, 'tense': tense, 'slot': slot}
    return None
