# Ranking data

Generated on 2026-11-08 using `scripts/prepare-ranking.py`.

## Multi-word expressions

`phrases.txt` is derived from Princeton WordNet 3.0, distributed by NLTK:
https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip

Only multi-word lemmas with 2–6 alphabetic words and at most 40 letters are retained. Underscores become spaces; duplicates are removed. No definitions are included. This is a lexical phrase catalogue, not a table of measured phrase frequencies. It includes technical expressions and names as well as everyday phrases.

WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.
The full upstream licence is in `LICENSE-wordnet.txt`.
https://wordnet.princeton.edu/license-and-commercial-use

## Word frequencies

`frequencies.json` is adapted from Hermit Dave's FrequencyWords English 2018 50k list, derived from OpenSubtitles2018:
https://github.com/hermitdave/FrequencyWords/blob/master/content/2018/en/en_50k.txt

Original counts are preserved for lowercase alphabetic tokens. Other tokens are omitted and the text table is converted to JSON. This adapted data file is licensed under **CC BY-SA 4.0**:
https://creativecommons.org/licenses/by-sa/4.0/

Attribution: Hermit Dave / FrequencyWords; OpenSubtitles2018 / OPUS.
Repository content licence statement: https://github.com/hermitdave/FrequencyWords#license

The data licence applies to the frequency dataset; it does not require the application code to use that licence. Frequency scores reflect subtitle usage, including names and conversational bias, and are a heuristic rather than a guarantee of natural language.
