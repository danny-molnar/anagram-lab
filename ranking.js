export const signature = words => (Array.isArray(words) ? words.join('') : words).replace(/[^a-z]/g, '').split('').sort().join('');
export function languageModel(frequencies = {}, phraseText = '') {
  const maximum = Math.max(1, ...Object.values(frequencies));
  const cost = word => 3 + Math.log(maximum / Math.max(1, frequencies[word] || 1));
  const phrases = new Map(), known = new Set();
  for (const line of phraseText.split('\n')) {
    const phrase = line.trim().toLowerCase();
    if (!/^[a-z]+(?: [a-z]+){1,5}$/.test(phrase)) continue;
    const words = phrase.split(' '), key = signature(words);
    if (!phrases.has(key)) phrases.set(key, []);
    phrases.get(key).push(words); known.add(phrase);
  }
  return {cost, phrases, known};
}

// A bounded best-first frontier. Trimming retains the most promising states;
// callers report the resulting search as partial even if the frontier empties.
export class Frontier {
  items = [];
  push(state) {
    const a = this.items; a.push(state); let i = a.length - 1;
    while (i) {
      const parent = (i - 1) >> 1;
      if (a[parent].priority <= state.priority) break;
      a[i] = a[parent]; i = parent;
    }
    a[i] = state;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      while (2 * i + 1 < a.length) {
        let child = 2 * i + 1;
        if (child + 1 < a.length && a[child + 1].priority < a[child].priority) child++;
        if (last.priority <= a[child].priority) break;
        a[i] = a[child]; i = child;
      }
      a[i] = last;
    }
    return first;
  }
  trim(limit) {
    if (this.items.length <= limit) return false;
    this.items.sort((a, b) => a.priority - b.priority);
    this.items.length = Math.floor(limit / 2);
    return true;
  }
}
