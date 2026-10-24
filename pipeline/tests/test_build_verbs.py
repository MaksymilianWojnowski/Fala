from pipeline.build_verbs import apply_review, diff_rows, merge_review, select_verbs, wiki_forms
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


def test_select_verbs_skips_words_without_counting_them():
    assert select_verbs(['ser 90', 'prazer 80', 'fazer 70'], 2, [], {'prazer'}) == ['ser', 'fazer']


def test_manual_row_for_field_without_diff_is_applied():
    manual = {'lemma': 'destruir', 'field': 'pres.ele', 'ours': 'destrui', 'wiktionary': 'destrói|destrui', 'chosen': 'destrói'}
    assert diff_rows('destruir', conjugate('destruir'), {}, set()) == []  # the diff does not regenerate it
    rows = merge_review([], [manual], {'destruir'})
    assert rows == [manual]
    assert apply_review(conjugate('destruir'), rows)['forms']['pres']['ele'] == 'destrói'


def test_select_verbs_skips_words_verbecc_cannot_conjugate():
    assert select_verbs(['der 100', 'ser 90'], 1, []) == ['ser']
