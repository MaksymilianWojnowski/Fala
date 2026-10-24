from pipeline.verbs import compound, conjugate, normalize_br, strip_pronoun


def test_strip_pronoun():
    assert strip_pronoun('eu tinha falado', 'eu') == 'tinha falado'
    assert strip_pronoun('que eu fale', 'eu') == 'fale'
    assert strip_pronoun('quando nós formos', 'nós') == 'formos'
    assert strip_pronoun('por falarmos nós', 'nós') == 'falarmos'
    assert strip_pronoun('faça você', 'você') == 'faça'


def test_normalize_br():
    assert normalize_br('perf', 'nos', 'falámos') == 'falamos'
    assert normalize_br('pres', 'nos', 'falamos') == 'falamos'


def test_fazer():
    v = conjugate('fazer'); f = v['forms']
    assert (f['pres']['eu'], f['perf']['nos'], f['imperf']['nos']) == ('faço', 'fizemos', 'fazíamos')
    assert (f['subj_imperf']['nos'], f['cond']['eles']) == ('fizéssemos', 'fariam')
    assert f['imp'] == {'ele': 'faça', 'nos': 'façamos', 'eles': 'façam'}
    assert (v['participle'], v['gerund']) == ('feito', 'fazendo')
    assert {'pres.eu', 'perf.eu', 'participle'} <= set(v['irregular']) and 'imperf.eu' not in v['irregular']


def test_spec_asserts():   # spec §5.2 step 7 + compounds
    assert conjugate('falar')['forms']['perf']['nos'] == 'falamos'
    assert conjugate('pôr')['forms']['perf']['ele'] == 'pôs'
    assert conjugate('ser')['forms']['imperf']['eu'] == 'era'
    assert conjugate('ir')['forms']['subj_fut']['eles'] == 'forem'
    assert conjugate('ter')['forms']['mqp_comp']['eu'] == 'tinha tido'
    assert conjugate('falar')['forms']['inf_pess']['nos'] == 'falarmos'
    assert conjugate('falar')['forms']['prog']['nos'] == 'estamos falando'
    assert conjugate('falar')['forms']['fut_ir']['eu'] == 'vou falar'
    assert conjugate('falar')['irregular'] == []


def test_compound_with_two_participles():
    ter, estar, ir = (conjugate(x)['forms'] for x in ('ter', 'estar', 'ir'))
    c = compound(ter, estar, ir, 'pagar', 'pago|pagado', 'pagando')
    assert c['perf_comp']['eu'] == 'tenho pago|tenho pagado'


def test_unknown_word_is_predicted():
    assert conjugate('lugar')['predicted'] is True
