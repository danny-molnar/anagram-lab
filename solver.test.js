import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dictionary, solve, normalize} from './solver.js';
const entries = dictionary('listen silent enlist inlets tinsel the eyes they see dirty room dormitory a i cat dog aa');
const run = options => solve(entries, {text:'silent', mode:'multi', min:2, max:3, ...options});
test('normalizes accents, punctuation and case', () => assert.equal(normalize('Éyes, THE! 123'), 'eyesthe'));
test('single-word anagrams', () => assert.deepEqual(new Set(run({mode:'single'}).results.map(w => w[0])), new Set(['listen','silent','enlist','inlets','tinsel'])));
test('multi-word anagrams consume exact repeated letters without permutations', () => {
  const result = run({text:'the eyes', exact:2});
  assert.equal(result.results.filter(w => w.includes('they') && w.includes('see')).length, 1);
  for (const words of result.results) assert.equal(normalize(words.join('')).split('').sort().join(''), 'eeehsty');
});
test('required and excluded words', () => {
  assert.deepEqual(run({text:'the eyes', required:'they', excluded:'eyes'}).results, [['they','see']]);
  assert.throws(() => run({required:'dog'}), /not available/);
});
test('repeated words are supported', () => assert.deepEqual(run({text:'catcat', exact:2}).results, [['cat','cat']]));
test('exact count, minimum length and no match', () => {
  assert.equal(run({text:'the eyes', exact:1}).results.length, 0);
  assert.equal(run({text:'dormitory', min:5, exact:2}).results.length, 0);
  assert.equal(run({text:'zzz'}).results.length, 0);
});
test('result cap is explicit', () => { const result = run({limit:1}); assert.equal(result.results.length, 1); assert.equal(result.reason, 'results'); });
test('rejects empty and overly long inputs', () => { assert.throws(() => run({text:'!!'})); assert.throws(() => run({text:'a'.repeat(41)})); });
test('bundled dictionary finds familiar examples', () => {
  const full = dictionary(readFileSync(new URL('./data/words.txt', import.meta.url), 'utf8'));
  for (const [text, required, expected] of [['the eyes','they','see'],['dormitory','dirty','room']]) {
    const result = solve(full, {text, required, exact:2, min:2, max:3});
    assert(result.results.some(words => words.includes(expected)));
  }
});

// Ranking tests use both controlled examples and the actual shipping assets.
import {languageModel, Frontier} from './ranking.js';
const readData = name => readFileSync(new URL(`./data/${name}`, import.meta.url), 'utf8');
const full = dictionary(readData('words.txt'));
const model = languageModel(JSON.parse(readData('frequencies.json')), readData('phrases.txt'));
const ranked = options => solve(full, {text:'s white grapes', min:2, max:3, ...options}, () => {}, model);
test('real phrase is first even at a one-result cap', () => {
  const result = ranked({limit:1});
  assert.deepEqual(result.results, [['stage','whisper']]);
  assert.equal(result.reason, 'results');
});
test('known phrase uses natural order and respects required words', () => {
  assert.deepEqual(ranked({required:'whisper', limit:1}).results[0], ['stage','whisper']);
});
test('phrase lookup respects all search constraints', () => {
  for (const options of [{excluded:'stage'}, {min:6}, {exact:3}, {mode:'single'}]) {
    assert(!ranked({...options, limit:10}).results.some(w => w.join(' ') === 'stage whisper'));
  }
});
test('known expressions other than the original example are recognised', () => {
  assert.deepEqual(ranked({text:'cream ice', limit:1}).results[0], ['ice','cream']);
});
test('frequency ranking searches common combinations before rare ones', () => {
  const words = dictionary('the eyes they see sheet ey');
  const language = languageModel({the:1000, eyes:900, they:800, see:700, sheet:30, ey:1});
  const result = solve(words, {text:'the eyes', min:2, exact:2, max:2, limit:1}, () => {}, language);
  assert.deepEqual(new Set(result.results[0]), new Set(['the','eyes']));
});
test('ranked results have exact letters, no reordered duplicates, and increasing word cost after known phrases', () => {
  const result = ranked({limit:100}), keys = new Set(); let last = -Infinity;
  for (const words of result.results) {
    assert.equal(normalize(words.join('')).split('').sort().join(''), normalize('s white grapes').split('').sort().join(''));
    const key = [...words].sort().join(' '); assert(!keys.has(key)); keys.add(key);
    if (!model.known.has(words.join(' '))) {
      const cost = words.reduce((sum, word) => sum + model.cost(word), 0);
      assert(cost >= last - 1e-9); last = cost;
    }
  }
});
test('frontier yields cheapest states and retains that property after trimming', () => {
  const frontier = new Frontier();
  for (const priority of [8,2,9,1,3,7,4,6,5]) frontier.push({priority});
  assert(frontier.trim(6));
  assert.deepEqual(Array.from({length:3}, () => frontier.pop().priority), [1,2,3]);
});
test('streamed results match final order and preserve phrase-first matching', () => {
  const streamed = [];
  const result = solve(full, {text:'s white grapes', min:2, max:3, limit:30}, batch => streamed.push(...batch), model);
  assert.deepEqual(streamed, result.results);
  assert.deepEqual(streamed[0], ['stage','whisper']);
});
