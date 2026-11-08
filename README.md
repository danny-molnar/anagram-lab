# Anagram Lab

A static English anagram solver for GitHub Pages. Plain HTML, CSS and JavaScript; no build step, API keys, dependencies or backend. The dictionary is bundled, and input never leaves the browser.

## Run locally

From this directory:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Serve over HTTP; JavaScript modules and workers do not work reliably with `file://`.

## Publish on GitHub Pages

1. Put the **contents of this directory**, including `.github`, in the root of a GitHub repository on the `main` branch.
2. In the repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or run **Deploy to GitHub Pages** from the Actions tab.

The workflow tests the solver, packages only the public assets, and deploys them. Paths are relative, so project URLs such as `https://USER.github.io/REPOSITORY/` work without configuration. If your default branch differs, change the branch in `.github/workflows/pages.yml`.

GitHub's workflow reference: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Features

- Single-word and multi-word exact anagrams, using every letter exactly once.
- Numbered crossword-style boxes for known positions, one per input letter. Leave unknown boxes blank; typing advances, arrow keys navigate, backspace moves back from an empty box, and Clear removes all crossers. Paste a pattern into any box: `silent` + `?i?e??` → `enlist`. Use `?`, `_`, `.` or `-` for unknown letters. Patterns cover every input letter, ignoring spaces; multi-word results are arranged to match, with one ordering per combination. Known phrases receive priority only when their recognised order matches.
- Maximum or exact word count, minimum word length, required words and excluded words.
- Case, spaces and punctuation are ignored; decomposable accents are folded to ASCII. Only English A–Z letters participate.
- Repeated words are allowed; reordered duplicates are omitted.
- Known expressions first, followed by combinations ranked using word frequency and a word-count penalty.
- Streaming results, stop button, result filtering, copy and text export.
- Muted sage, lavender and peach palette with readable text contrast.
- Phone layout with 44–52px touch targets, 16px form text, safe-area spacing, page-scrolling results and shortcuts to edit or stop a search. Mobile searches dismiss the keyboard and scroll to results, respecting reduced-motion preferences.
- Responsive, keyboard-accessible interface with no external fonts or scripts.

## Search design and limits

Each word is represented by a 26-element letter-count vector. The engine first looks up the input's sorted-letter signature in a catalogue of 60,607 WordNet multi-word expressions. Matching expressions are checked against every constraint, ranked by word cost and emitted in their recognised word order **before** general enumeration. This keeps known phrases visible even with a small result cap: `s white grapes → stage whisper`.

The remaining combinations are explored with a best-first A* search, rather than sorting an arbitrary first 500 answers. Each word costs `3 + log(maximum_frequency / max(1, word_frequency))`; unknown words have frequency 1. Lower total cost favours common words and fewer words. An optimistic cost-per-letter bound guides partial combinations toward the lowest-cost complete answers. A fixed candidate order removes reordered duplicates while allowing repeated words. Exact phrase matches receive priority over this cost ordering.

The search frontier is bounded at 40,000 states; if it grows larger, the most promising 20,000 are retained and the search is explicitly marked partial. Without pruning, general results emerge in increasing total word cost. Pruned or time-limited searches do not guarantee the globally best combinations. A phrase lookup is not a full sentence model: expressions absent from the catalogue can still be missed or ordered awkwardly.
Dictionary parsing and searching happen in a module Web Worker so the interface remains usable. Stop terminates the worker and reloads its dictionary. Limits are 40 input letters, 6 words, 500 results and approximately 6 seconds per search; capped searches are explicitly marked as partial. An exact word count takes precedence over the maximum. Long inputs can have enormous numbers of solutions; constrain the word count and supply a required word to narrow the search.

The word list includes rare words, abbreviations and potentially offensive terms. Multi-word results are letter-valid combinations rather than guaranteed grammatical phrases. Proper names and some modern words may be missing. No remote AI service is used. WordNet expressions include technical terms and names; recognition does not guarantee that an expression is everyday language.

## Dictionary

`data/words.txt` is the `words_alpha.txt` list from https://github.com/dwyl/english-words, downloaded 2026-11-08. Its upstream licence is preserved in `data/LICENSE-dictionary.md`; see the upstream README for provenance. All single-letter entries except `a` and `i` are removed at runtime. The initial uncompressed dictionary download is approximately 4 MB, plus approximately 1.7 MB of ranking data. Ranking sources, transformations, data licences and the regeneration script are documented in [data/README.md](data/README.md). Replace the file with a newline-separated English word list to customise coverage.

## Tests

Node.js 22 or later, no installation required:

```sh
npm test
```

Tests cover exact letter accounting, repeated words, permutation removal, constraints, normalization, invalid inputs, result limits example searches against the bundled dictionary, phrase precedence under a one-result cap, phrase constraints and word order, frequency ordering, streaming order, and frontier behaviour.
