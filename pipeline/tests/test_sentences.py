from dataclasses import replace

import pytest

from pipeline.sentences import Tok, find_gap, is_br, length_ok, simple_tense, slot_of
from pipeline.verbs import conjugate

V = {l: conjugate(l) for l in ('comer', 'falar')}
PAST_1S = {'Mood': 'Ind', 'Tense': 'Past', 'Person': '1', 'Number': 'Sing', 'VerbForm': 'Fin'}


def T(i, text, lemma, pos, morph, dep='root', head=None):
    # idx is filled in by sent(), which knows the sentence text.
    return Tok(i, text, lemma, pos, morph, dep, i if head is None else head, -1)


def sent(s, *toks):
    out, at = [], 0
    for t in toks:
        at = s.index(t.text, at)
        out.append(replace(t, idx=at))
        at += len(t.text)
    return list(out)


def test_is_br():
    assert not is_br('Eu peguei o autocarro.') and not is_br('Estou a fazer o jantar.')
    assert not is_br('Nós falámos ontem.') and is_br('A gente foi à praia.')
    assert not is_br('Vós sois muito gentis.')
    assert not is_br('Fui à casa de banho.')
    assert not is_br('Ele está a comer.') and is_br('Ele está comendo.')


def test_length_ok():
    assert length_ok('Eu como pão todo dia.')
    assert not length_ok('Sim.') and not length_ok('um dois três quatro cinco seis sete oito nove dez onze doze treze catorze quinze')


def test_simple_tense_and_slot():
    assert simple_tense({'Mood': 'Ind', 'Tense': 'Pres'}) == 'pres'
    assert simple_tense({'Mood': 'Sub', 'Tense': 'Imp'}) == 'subj_imperf'
    assert simple_tense({'Mood': 'Cnd'}) == 'cond'
    assert simple_tense({'Mood': 'Imp'}) == 'imp'
    assert simple_tense({'VerbForm': 'Inf', 'Person': '1', 'Number': 'Plur'}) == 'inf_pess'
    assert simple_tense({'VerbForm': 'Inf'}) is None
    assert slot_of({'Person': '1', 'Number': 'Sing'}) == 'eu'
    assert slot_of({'Person': '3', 'Number': 'Plur'}) == 'eles'
    assert slot_of({'Person': '2', 'Number': 'Plur'}) is None


def test_simple_perf():
    s = 'Ontem eu comi feijoada.'
    toks = sent(s, T(0, 'Ontem', 'ontem', 'ADV', {}), T(1, 'eu', 'eu', 'PRON', {}),
                T(2, 'comi', 'comer', 'VERB', PAST_1S), T(3, 'feijoada', 'feijoada', 'NOUN', {}))
    assert find_gap(toks, V) == {'start': 9, 'end': 13, 'lemma': 'comer', 'tense': 'perf', 'slot': 'eu'}


def test_compound_mqp():
    s = 'Eu tinha falado com ele.'
    toks = sent(s,
                T(0, 'Eu', 'eu', 'PRON', {}, dep='nsubj', head=2),
                T(1, 'tinha', 'ter', 'AUX', {'Mood': 'Ind', 'Tense': 'Imp', 'Person': '1', 'Number': 'Sing',
                                             'VerbForm': 'Fin'}, dep='aux', head=2),
                T(2, 'falado', 'falar', 'VERB', {'VerbForm': 'Part'}),
                T(3, 'com', 'com', 'ADP', {}, dep='case', head=4),
                T(4, 'ele', 'ele', 'PRON', {}, dep='obl', head=2))
    gap = find_gap(toks, V)
    assert gap == {'start': 3, 'end': 15, 'lemma': 'falar', 'tense': 'mqp_comp', 'slot': 'eu'}
    assert s[gap['start']:gap['end']] == 'tinha falado'


@pytest.mark.parametrize('s, aux, verb, tense, slot, span', [
    ('Eles têm falado.', ('têm', 'ter', 'Pres', 'Plur', '3'), ('falado', 'falar', 'Part'), 'perf_comp', 'eles', 'têm falado'),
    ('Nós estamos comendo.', ('estamos', 'estar', 'Pres', 'Plur', '1'), ('comendo', 'comer', 'Ger'), 'prog', 'nos', 'estamos comendo'),
    ('Eu vou comer.', ('vou', 'ir', 'Pres', 'Sing', '1'), ('comer', 'comer', 'Inf'), 'fut_ir', 'eu', 'vou comer'),
])
def test_other_compounds(s, aux, verb, tense, slot, span):
    word, alem, mood_tense, number, person = aux
    lemma_v, vform = verb[1], verb[2]
    toks = sent(s,
                T(0, s.split()[0], 'x', 'PRON', {}, dep='nsubj', head=2),
                T(1, word, alem, 'AUX', {'Mood': 'Ind', 'Tense': mood_tense, 'Person': person, 'Number': number,
                                         'VerbForm': 'Fin'}, dep='aux', head=2),
                T(2, verb[0], lemma_v, 'VERB', {'VerbForm': vform}))
    gap = find_gap(toks, V)
    assert gap is not None and gap['tense'] == tense and gap['slot'] == slot and gap['lemma'] == lemma_v
    assert s[gap['start']:gap['end']] == span


def test_ambiguous_dropped():
    toks = sent('Nós falamos ontem.',
                T(0, 'Nós', 'nós', 'PRON', {}),
                T(1, 'falamos', 'falar', 'VERB', {'Mood': 'Ind', 'Tense': 'Past', 'Person': '1', 'Number': 'Plur',
                                                  'VerbForm': 'Fin'}),
                T(2, 'ontem', 'ontem', 'ADV', {}))
    assert find_gap(toks, V) is None


def test_tag_mismatch_dropped():
    toks = sent('Eu como feijoada.',
                T(0, 'Eu', 'eu', 'PRON', {}),
                T(1, 'como', 'comer', 'VERB', PAST_1S),
                T(2, 'feijoada', 'feijoada', 'NOUN', {}))
    assert find_gap(toks, V) is None


def test_tu_rejected():
    toks = sent('Tu falas muito.',
                T(0, 'Tu', 'tu', 'PRON', {}),
                T(1, 'falas', 'falar', 'VERB', {'Mood': 'Ind', 'Tense': 'Pres', 'Person': '2', 'Number': 'Sing',
                                                'VerbForm': 'Fin'}),
                T(2, 'muito', 'muito', 'ADV', {}))
    assert find_gap(toks, V) is None


def test_r23_plural_pt_pt_words():
    assert not is_br('As raparigas saíram.') and not is_br('Os telemóveis tocaram.')
    assert not is_br('Os autocarros chegaram.') and is_br('As meninas saíram.')


def test_r23_all_estar_forms_with_infinitive():
    assert not is_br('Ela esteve a trabalhar.') and not is_br('Ela estaria a trabalhar.')
    assert not is_br('Ela estivemos a trabalhar.') and not is_br('Ela estará a trabalhar.')
    assert not is_br('Eles estejam a trabalhar.') and not is_br('Ela está a fazê-lo.')
    assert is_br('Ela esteve trabalhando.')


def test_r23_nfc_normalized():
    import unicodedata
    assert not is_br(unicodedata.normalize('NFD', 'O ecrã partiu.'))
    assert not is_br(unicodedata.normalize('NFD', 'Os telemóveis tocaram.'))


def test_pick_caps_shortest_per_lemma_tense():
    from pipeline.build_sentences import pick
    s = [{'id': i, 'pt': 'x' * n, 'gap': {'lemma': 'comer', 'tense': 'pres'}} for i, n in [(1, 30), (2, 10), (3, 20)]]
    s.append({'id': 4, 'pt': 'x' * 5, 'gap': {'lemma': 'falar', 'tense': 'pres'}})
    assert [x['id'] for x in pick(s, 2)] == [2, 3, 4]
