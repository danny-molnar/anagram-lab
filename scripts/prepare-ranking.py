"""Build offline ranking assets from WordNet 3.0 and FrequencyWords 2018.
Usage: python3 scripts/prepare-ranking.py WORDNET_ZIP EN_50K_TXT
Downloads and source/licence links are documented in data/README.md.
"""
import json
from pathlib import Path
import re
import sys
import zipfile

out = Path(__file__).resolve().parents[1] / 'data'
with zipfile.ZipFile(sys.argv[1]) as archive:
    phrases = set()
    # Index files list one lemma per line; no gloss text or definitions are copied.
    for part in ('noun', 'verb', 'adj', 'adv'):
        for line in archive.read(f'wordnet/index.{part}').decode().splitlines():
            if not line or line.startswith(' '):
                continue
            lemma = line.split()[0].lower()
            if re.fullmatch(r'[a-z]+(?:_[a-z]+){1,5}', lemma):
                phrase = lemma.replace('_', ' ')
                if len(phrase.replace(' ', '')) <= 40:
                    phrases.add(phrase)
    (out / 'phrases.txt').write_text('\n'.join(sorted(phrases)) + '\n')
    (out / 'LICENSE-wordnet.txt').write_bytes(archive.read('wordnet/LICENSE'))
frequencies = {}
for line in Path(sys.argv[2]).read_text().splitlines():
    word, count = line.split()
    if re.fullmatch('[a-z]+', word):
        frequencies[word] = int(count)
(out / 'frequencies.json').write_text(json.dumps(frequencies, separators=(',', ':')) + '\n')
print(f'{len(phrases)} phrases; {len(frequencies)} frequency entries')
