"""Tatoeba Portuguese sentences -> src/data/sentences.json. Tagging is resumable via pipeline/.cache/tagged.jsonl."""
from __future__ import annotations

import argparse
import bz2
import csv
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

from pipeline.fetch import CACHE, fetch
from pipeline.sentences import Tok, alternates, find_gap, is_br, length_ok, nfc

ROOT = Path(__file__).resolve().parents[1]
VERBS = ROOT / 'src/data/verbs.json'
OUT = ROOT / 'src/data/sentences.json'
TAGGED = CACHE / 'tagged.jsonl'
BASE = 'https://downloads.tatoeba.org/exports/per_language'
POR_URL = f'{BASE}/por/por_sentences_detailed.tsv.bz2'
ENG_URL = f'{BASE}/eng/eng_sentences.tsv.bz2'
LINKS_URL = f'{BASE}/por/por-eng_links.tsv.bz2'
CAP = 20  # max sentences per (lemma, tense); 30 gave 3.06 MB, over the 3 MB cap
INCOMPLETE = 3  # exit code: tagging unfinished, rerun to continue
VERB_POS = ('VERB', 'AUX')


def _rows(url: str, name: str):
    with bz2.open(fetch(url, name), 'rt', encoding='utf-8', newline='') as f:
        yield from csv.reader(f, delimiter='\t', quoting=csv.QUOTE_NONE)


def candidates() -> dict[int, tuple[str, str, str]]:
    """Portuguese BR sentences of length 3..14 with a linked English sentence: id -> (pt, en, author)."""
    pt: dict[int, tuple[str, str]] = {}
    for row in _rows(POR_URL, 'tatoeba/por_sentences_detailed.tsv.bz2'):
        text = nfc(row[2].strip())
        if is_br(text) and length_ok(text):
            pt[int(row[0])] = (text, row[3])
    linked: dict[int, int] = {}
    for p, e in _rows(LINKS_URL, 'tatoeba/por-eng_links.tsv.bz2'):
        if int(p) in pt and int(p) not in linked:
            linked[int(p)] = int(e)
    needed = set(linked.values())
    eng = {int(r[0]): r[2].strip() for r in _rows(ENG_URL, 'tatoeba/eng_sentences.tsv.bz2') if int(r[0]) in needed}
    return {p: (pt[p][0], eng[e], pt[p][1]) for p, e in linked.items() if eng.get(e)}


def load_tagged() -> set[int]:
    """Ids already in the cache. Drops a partial last line from an interrupted run."""
    if not TAGGED.exists():
        return set()
    ids, good = set(), []
    lines = TAGGED.read_text(encoding='utf-8').splitlines()
    for line in lines:
        try:
            ids.add(json.loads(line)['id'])
            good.append(line)
        except (json.JSONDecodeError, KeyError):
            continue
    if len(good) != len(lines):
        TAGGED.write_text(''.join(line + '\n' for line in good), encoding='utf-8')
    return ids


def tag(pending: list[tuple[int, str]]) -> None:
    import spacy
    nlp = spacy.load('pt_core_news_lg', exclude=['ner'])
    CACHE.mkdir(parents=True, exist_ok=True)
    start = time.time()
    with TAGGED.open('a', encoding='utf-8') as f:
        docs = nlp.pipe((text for _, text in pending), batch_size=512)
        for n, ((sid, _), doc) in enumerate(zip(pending, docs), 1):
            toks = [[t.i, t.text, t.lemma_, t.pos_, t.morph.to_dict(), t.dep_, t.head.i, t.idx] for t in doc]
            if not any(t.pos_ in VERB_POS for t in doc):
                toks = None  # no verb: the gap finder cannot use it
            f.write(json.dumps({'id': sid, 'toks': toks}, ensure_ascii=False) + '\n')
            if n % 5000 == 0:
                f.flush()
                print(f'tagged {n}/{len(pending)} in {time.time() - start:.0f}s', flush=True)
    print(f'tagged {len(pending)} sentences in {time.time() - start:.0f}s', flush=True)


def pick(found: list[dict], cap: int) -> list[dict]:
    """found: sentence dicts with a gap. Keep the shortest `cap` per (lemma, tense), then sort by id."""
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for s in found:
        groups[(s['gap']['lemma'], s['gap']['tense'])].append(s)
    kept = [s for g in groups.values() for s in sorted(g, key=lambda s: (len(s['pt']), s['id']))[:cap]]
    return sorted(kept, key=lambda s: s['id'])


def main(limit: int | None = None) -> int:
    cands = candidates()
    done = load_tagged()
    pending = [(sid, cands[sid][0]) for sid in sorted(cands) if sid not in done]
    if pending:
        if limit is not None:
            pending = pending[:limit]
        tag(pending)
    untagged = cands.keys() - done - {sid for sid, _ in pending}
    if untagged:
        print(f'{len(untagged)} sentences still untagged; rerun to continue', file=sys.stderr)
        return INCOMPLETE

    verbs = {v['lemma']: v for v in json.loads(VERBS.read_text(encoding='utf-8'))}
    found = []
    with TAGGED.open(encoding='utf-8') as f:
        for line in f:
            rec = json.loads(line)
            if rec['toks'] is None or rec['id'] not in cands:
                continue
            pt, en, author = cands[rec['id']]
            gap = find_gap([Tok(*t) for t in rec['toks']], verbs)
            if gap is None or gap['slot'] == 'tu':
                continue
            cell = verbs[gap['lemma']]['forms'][gap['tense']][gap['slot']]
            if pt[gap['start']:gap['end']].lower() not in alternates(cell):
                continue
            found.append({'id': rec['id'], 'pt': pt, 'en': en, 'author': author, 'gap': gap})

    out = pick(found, CAP)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    counts = defaultdict(int)
    for s in out:
        counts[s['gap']['tense']] += 1
    print(f'{len(out)} sentences, {OUT.stat().st_size / 1e6:.2f} MB')
    for tense, n in sorted(counts.items()):
        print(f'  {tense}: {n}')
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, help='tag at most this many new sentences per run')
    sys.exit(main(parser.parse_args().limit))
