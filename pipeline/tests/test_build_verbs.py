from pipeline.build_verbs import apply_review, diff_rows, select_verbs, wiki_forms
from pipeline.verbs import conjugate


def test_select_verbs():
    lines = ['de 100', 'ser 90', 'lugar 80', 'fazer 70', 'mulher 60', 'pôr 50', 'comer 40']
    assert select_verbs(lines, 2, ['dizer']) == ['ser', 'fazer', 'dizer']


def test_wiki_forms_and_diff():
    entries = [{'pos': 'verb', 'senses': [{'glosses': ['to make']}], 'forms': [
        {'form': 'fizemos', 'tags': ['first-person', 'indicative', 'plural', 'preterite']},
        {'form': 'fizémos', 'tags': ['first-person', 'indicative', 'plural', 'preterite', 'Portugal']},
        {'form': 'feito', 'tags': ['participle', 'past']}]}]
    wiki, parts, gloss = wiki_forms(entries)
    assert wiki['perf.nos'] == {'fizemos'} and gloss == 'to make'
    verb = {'lemma': 'fazer', 'participle': 'feito', 'forms': {'perf': {'nos': 'fazemos'}}}
    assert diff_rows('fazer', verb, wiki, parts) == [
        {'lemma': 'fazer', 'field': 'perf.nos', 'ours': 'fazemos', 'wiktionary': 'fizemos', 'chosen': ''}]


def test_apply_review_participle():
    v = apply_review(conjugate('pagar'), [{'lemma': 'pagar', 'field': 'participle', 'ours': 'pagado',
                                           'wiktionary': 'pagado|pago', 'chosen': 'pago|pagado'}])
    assert v['participle'] == 'pago|pagado'
    assert v['forms']['perf_comp']['eu'] == 'tenho pago|tenho pagado'


def test_invalid_field_always_gets_a_row():
    verb = {'lemma': 'pagar', 'participle': 'pago', 'invalid': ['perf.nos'], 'forms': {'perf': {'nos': 'pag)'}}}
    assert diff_rows('pagar', verb, {}, set()) == [
        {'lemma': 'pagar', 'field': 'perf.nos', 'ours': 'pag)', 'wiktionary': '', 'chosen': ''}]
