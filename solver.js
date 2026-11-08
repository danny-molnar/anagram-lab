import {Frontier, signature} from './ranking.js';
export const normalize = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
export function counts(text) {
  const result = new Uint8Array(26);
  for (const c of text) result[c.charCodeAt(0) - 97]++;
  return result;
}
const fits = (a, b) => a.every((n, i) => n <= b[i]);
export function dictionary(text) {
  return [...new Set(text.split(/\s+/).map(w => w.toLowerCase()).filter(w => /^[a-z]+$/.test(w) && (w.length > 1 || w === 'a' || w === 'i')))]
    .sort((a, b) => b.length - a.length || a.localeCompare(b)).map(word => ({word, letters: counts(word)}));
}
export function solve(entries, options, emit = () => {}, language = null) {
  const started = Date.now(), input = normalize(options.text);
  if (!input.length || input.length > 40) throw new Error('Enter between 1 and 40 letters.');
  const pattern = (options.pattern || '').trim().toLowerCase().replace(/\s/g, '').replace(/[_.-]/g, '?');
  if (pattern && /[^a-z?]/.test(pattern)) throw new Error('Use A–Z letters and ? (or _ . -) for unknown positions.');
  if (pattern && pattern.length !== input.length) throw new Error(`The pattern must have ${input.length} positions, one for each input letter. Spaces are ignored.`);
  if (pattern && !fits(counts(pattern.replace(/\?/g, '')), counts(input))) throw new Error('Known positions use letters that are not available.');
  const matchesAt = (word, offset) => !pattern || [...word].every((letter, i) => pattern[offset + i] === '?' || pattern[offset + i] === letter);
  function arrange(words, offset = 0) {
    if (!pattern) return words;
    if (!words.length) return [];
    const tried = new Set();
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (tried.has(word) || !matchesAt(word, offset)) continue;
      tried.add(word);
      const tail = arrange(words.filter((_, j) => j !== i), offset + word.length);
      if (tail) return [word, ...tail];
    }
    return null;
  }
  const min = Number(options.min || 1), max = Number(options.max || 3);
  if (!Number.isInteger(min) || min < 1 || min > 20 || !Number.isInteger(max) || max < 1 || max > 6) throw new Error('Check the word length and word count limits.');
  const required = (options.required || '').trim().split(/\s+/).map(normalize).filter(Boolean);
  const remaining = counts(input);
  for (const word of required) {
    if (!entries.some(e => e.word === word)) throw new Error(`Required word “${word}” is not in the dictionary.`);
    if (word.length < min) throw new Error('A required word is shorter than the minimum length.');
    const letters = counts(word);
    if (!fits(letters, remaining)) throw new Error('Required words use letters that are not available.');
    letters.forEach((n, i) => remaining[i] -= n);
  }
  const exact = options.mode === 'single' ? 1 : Number(options.exact || 0);
  if (!Number.isInteger(exact) || exact < 0 || exact > 6) throw new Error('Choose an exact word count from 1 to 6.');
  const slots = (exact || max) - required.length;
  if (slots < 0) throw new Error('Required words exceed the word count.');
  const excluded = new Set((options.excluded || '').toLowerCase().split(/[\s,]+/).filter(Boolean));
  if (required.some(w => excluded.has(w))) throw new Error('A required word is also excluded.');
  const cost = language?.cost || (() => 10);
  const candidates = entries.filter(e => e.word.length >= min && !excluded.has(e.word) && fits(e.letters, remaining) && (exact !== 1 || matchesAt(e.word, 0)))
    .map(e => ({...e, cost: cost(e.word)}))
    .sort((a, b) => a.cost / a.word.length - b.cost / b.word.length || a.word.localeCompare(b.word));
  const results = [], seen = new Set();
  let limited = false, reason = '', batch = [], checks = 0, pruned = false;
  const limit = options.limit ?? 500;
  function add(words) {
    const key = [...words].sort().join(' ');
    if (seen.has(key)) return;
    words = arrange(words);
    if (!words) return;
    seen.add(key); results.push(words); batch.push(words);
    if (batch.length >= 25) { emit(batch); batch = []; }
    if (results.length >= limit) { limited = true; reason = 'results'; }
  }
  // Exact phrase lookup precedes enumeration, so a low result cap cannot hide
  // a recognised expression behind thousands of unrelated combinations.
  const vocabulary = new Set(entries.map(e => e.word));
  const phrases = (language?.phrases.get(signature(input)) || []).filter(words => {
    if (pattern && !matchesAt(words.join(''), 0)) return false;
    if (words.length > (exact || max) || (exact && words.length !== exact)) return false;
    if (words.some(w => w.length < min || excluded.has(w) || !vocabulary.has(w))) return false;
    const available = [...words];
    for (const word of required) {
      const index = available.indexOf(word);
      if (index === -1) return false;
      available.splice(index, 1);
    }
    return true;
  }).sort((a, b) => a.reduce((n, w) => n + cost(w), 0) - b.reduce((n, w) => n + cost(w), 0) || a.join(' ').localeCompare(b.join(' ')));
  for (const words of phrases) { add(words); if (limited) break; }
  if (batch.length) { emit(batch); batch = []; }

  // A* with an optimistic cost-per-letter bound. Complete combinations emerge
  // in increasing frequency cost, rather than sorting an arbitrary first 500.
  const rates = new Array(candidates.length + 1).fill(Infinity);
  for (let i = candidates.length - 1; i >= 0; i--) rates[i] = Math.min(rates[i + 1], candidates[i].cost / candidates[i].word.length);
  const frontier = new Frontier();
  const length = remaining.reduce((a, b) => a + b, 0);
  frontier.push({rest: remaining, length, start: 0, path: [], left: slots, cost: 0, priority: length ? length * rates[0] : 0});
  while (frontier.items.length && !limited) {
    if (Date.now() - started > (options.timeLimit ?? 6000)) { limited = true; reason = 'time'; break; }
    const state = frontier.pop();
    if (!state.length) {
      if (!exact || required.length + state.path.length === exact) add([...required, ...state.path]);
      continue;
    }
    if (!state.left || state.length < min || (exact && state.length < state.left * min)) continue;
    for (let i = state.start; i < candidates.length; i++) {
      if (++checks % 1024 === 0 && Date.now() - started > (options.timeLimit ?? 6000)) { limited = true; reason = 'time'; break; }
      const e = candidates[i], size = e.word.length, nextLength = state.length - size;
      if (size > state.length || (state.left === 1 && nextLength) || !fits(e.letters, state.rest)) continue;
      if (exact && nextLength < (state.left - 1) * min) continue;
      const nextCost = state.cost + e.cost;
      frontier.push({rest: state.rest.map((n, j) => n - e.letters[j]), length: nextLength,
        start: i, path: [...state.path, e.word], left: state.left - 1, cost: nextCost,
        priority: nextCost + (nextLength ? nextLength * rates[i] : 0)});
      pruned = frontier.trim(options.frontierLimit ?? 40000) || pruned;
    }
  }
  if (batch.length) emit(batch);
  if (pruned && !limited) { limited = true; reason = 'frontier'; }
  return {results, limited, reason, elapsed: Date.now() - started, candidates: candidates.length};
}
