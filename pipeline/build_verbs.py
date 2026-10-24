"""Build src/data/verbs.json from verbecc plus Wiktionary (kaikki.org), gated by pipeline/review.csv."""
import copy
import csv
import json
import re
import sys
from pathlib import Path

from pipeline.fetch import FREQ_URL, fetch, kaikki_url
from pipeline.verbs import compound, conjugate, irregular_cells, simple_forms

ROOT = Path(__file__).resolve().parents[1]
REVIEW = Path(__file__).resolve().parent / 'review.csv'
EXTRA = Path(__file__).resolve().parent / 'extra_verbs.txt'
OUT = ROOT / 'src/data/verbs.json'
CANDIDATE = re.compile(r'^[a-zà-úç]+(ar|er|ir)$')
WIKI_TAGS = {'pres': {'indicative', 'present'}, 'perf': {'indicative', 'preterite'}, 'imperf': {'indicative', 'imperfect'},
             'fut': {'indicative', 'future'}, 'cond': {'conditional'}, 'subj_pres': {'subjunctive', 'present'},
             'subj_imperf': {'subjunctive', 'imperfect'}, 'subj_fut': {'subjunctive', 'future'},
             'inf_pess': {'infinitive'}, 'imp': {'imperative'}}
WIKI_SLOT = {('first-person', 'singular'): 'eu', ('second-person', 'singular'): 'tu', ('third-person', 'singular'): 'ele',
             ('first-person', 'plural'): 'nos', ('third-person', 'plural'): 'eles'}
SKIP_TAGS = {'Portugal', 'obsolete', 'archaic', 'negative', 'impersonal'}
LETTERS = re.compile(r'^[a-zà-úç]+$')
FIELDS = ['lemma', 'field', 'ours', 'wiktionary', 'chosen']


def select_verbs(freq_lines: list[str], n: int, extra: list[str]) -> list[str]:
    out = []
    for line in freq_lines:
        if len(out) == n:
            break
        word = line.split()[0]
        if not (CANDIDATE.match(word) or word == 'pôr'):
            continue
        if not conjugate(word)['predicted']:
            out.append(word)
    out += [w for w in extra if w not in out]
    return out


def wiki_forms(entries: list[dict]) -> tuple[dict[str, set[str]], set[str], str]:
    wiki: dict[str, set[str]] = {}
    participles: set[str] = set()
    gloss = ''
    for e in entries:
        if e.get('pos') != 'verb' or 'form_of' in e['senses'][0]:
            continue
        if not gloss:
            gloss = e['senses'][0]['glosses'][0]
        for f in e.get('forms', []):
            tags = set(f.get('tags', []))
            if tags & SKIP_TAGS or not LETTERS.match(f['form']):  # '-' is kaikki's no-form placeholder
                continue
            if 'participle' in tags:
                if not tags & {'feminine', 'plural'}:  # the table stores the masculine singular only
                    participles.add(f['form'])
                continue
            field = next((k for k, need in WIKI_TAGS.items() if need <= tags), None)
            slot = next((s for (p, n), s in WIKI_SLOT.items() if {p, n} <= tags), None)
            if field and slot:
                wiki.setdefault(f'{field}.{slot}', set()).add(f['form'])
    return wiki, participles, gloss


def _row(lemma: str, field: str, ours: str, wiki_vals: set[str]) -> dict:
    return {'lemma': lemma, 'field': field, 'ours': ours,
            'wiktionary': '|'.join(sorted(wiki_vals)), 'chosen': ''}


def diff_rows(lemma: str, verb: dict, wiki: dict[str, set[str]], wiki_participles: set[str]) -> list[dict]:
    rows = []
    invalid = set(verb.get('invalid', []))
    for t, cells in verb['forms'].items():
        for s, ours in cells.items():
            field = f'{t}.{s}'
            wf = wiki.get(field, set())
            if field in invalid or (wf and ours.split('|')[0] not in wf):
                rows.append(_row(lemma, field, ours, wf))
    if 'participle' in invalid or wiki_participles - set(verb['participle'].split('|')):
        rows.append(_row(lemma, 'participle', verb['participle'], wiki_participles))
    return rows


def apply_review(verb: dict, rows: list[dict]) -> dict:
    v = copy.deepcopy(verb)
    rows = [r for r in rows if r['chosen']]
    if not rows:
        return v
    if any(r['field'] in ('participle', 'gerund') for r in rows):
        for r in rows:
            if r['field'] in ('participle', 'gerund'):
                v[r['field']] = r['chosen']
        aux = [simple_forms(x)['forms'] for x in ('ter', 'estar', 'ir')]
        v['forms'].update(compound(*aux, v['lemma'], v['participle'], v['gerund']))
    for r in rows:
        if r['field'] not in ('participle', 'gerund'):
            t, s = r['field'].split('.')
            v['forms'][t][s] = r['chosen']
    v['irregular'] = irregular_cells(v['lemma'], v['forms'], v['participle'])
    return v


def _read_review() -> dict[tuple[str, str], str]:
    if not REVIEW.exists():
        return {}
    with REVIEW.open(encoding='utf-8', newline='') as f:
        return {(r['lemma'], r['field']): r['chosen'] for r in csv.DictReader(f)}


def main() -> int:
    freq = fetch(FREQ_URL, 'pt_br_50k.txt').read_text(encoding='utf-8').splitlines()
    lemmas = select_verbs(freq, 150, EXTRA.read_text(encoding='utf-8').split())
    old_choices = _read_review()
    all_rows: list[dict] = []
    verbs = []
    for rank, lemma in enumerate(lemmas, 1):
        v = conjugate(lemma)
        path = fetch(kaikki_url(lemma), f'kaikki/{lemma}.jsonl')
        entries = [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]
        if not entries:
            print(f'warning: no Wiktionary data for {lemma}', file=sys.stderr)
        wiki, parts, gloss = wiki_forms(entries)
        rows = diff_rows(lemma, v, wiki, parts)
        for r in rows:
            r['chosen'] = old_choices.get((lemma, r['field']), '')
        all_rows += rows
        verbs.append({'lemma': lemma, 'en': gloss, 'rank': rank, 'participle': '', 'gerund': '', 'forms': None,
                      'irregular': None, '_row': rows})
    with REVIEW.open('w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(all_rows)
    out = []
    for item in verbs:
        v = apply_review(conjugate(item['lemma']), item.pop('_row'))
        out.append({'lemma': v['lemma'], 'en': item['en'], 'rank': item['rank'], 'participle': v['participle'],
                    'gerund': v['gerund'], 'forms': v['forms'], 'irregular': v['irregular']})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    unresolved = [r for r in all_rows if not r['chosen']]
    for r in unresolved:
        print(f"unresolved: {r['lemma']} {r['field']} ours={r['ours']} wiktionary={r['wiktionary']}", file=sys.stderr)
    print(f'{len(out)} verbs, {len(all_rows)} review rows, {len(unresolved)} unresolved')
    return 1 if unresolved else 0


if __name__ == '__main__':
    sys.exit(main())
