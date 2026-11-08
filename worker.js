import {dictionary, solve} from './solver.js';
import {languageModel} from './ranking.js';
let entries, language;
self.onmessage = async ({data}) => {
  try {
    if (!entries) {
      const [words, frequencies, phrases] = await Promise.all(['words.txt','frequencies.json','phrases.txt'].map(async file => {
        const response = await fetch(`./data/${file}`);
        if (!response.ok) throw new Error('Could not load the dictionary and ranking data. Please reload and try again.');
        return response.text();
      }));
      language = languageModel(JSON.parse(frequencies), phrases);
      entries = dictionary(words);
    }
    if (data.type === 'init') { self.postMessage({type:'ready', count:entries.length}); return; }
    const result = solve(entries, data.options, results => self.postMessage({type:'batch', results,
      known:results.filter(words => language.known.has(words.join(' '))).map(words => words.join(' '))}), language);
    self.postMessage({type:'done', ...result, results:undefined});
  } catch (error) { self.postMessage({type:'error', message:error.message}); }
};
