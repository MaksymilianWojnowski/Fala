"""Download-once cache for the verb build. Everything lands in pipeline/.cache."""
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import quote

import certifi  # python.org builds on macOS ship no CA bundle

CACHE = Path('pipeline/.cache')
SSL = ssl.create_default_context(cafile=certifi.where())
FREQ_URL = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt_br/pt_br_50k.txt'
BACKOFF = (2, 5, 10)  # seconds before retry 1, 2, 3


def kaikki_url(lemma: str) -> str:
    return f'https://kaikki.org/dictionary/Portuguese/meaning/{quote(lemma[0])}/{quote(lemma[:2])}/{quote(lemma)}.jsonl'


def _get(url: str) -> bytes:
    for attempt in range(len(BACKOFF) + 1):
        time.sleep(0.2)
        try:
            with urllib.request.urlopen(url, timeout=60, context=SSL) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise
            err = e
        except (TimeoutError, urllib.error.URLError) as e:
            err = e
        if attempt < len(BACKOFF):
            time.sleep(BACKOFF[attempt])
    raise err


def fetch(url: str, name: str) -> Path:
    path = CACHE / name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            path.write_bytes(_get(url))
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            path.write_bytes(b'')  # shortcut: 404 cached as empty, delete the file to retry
    return path
