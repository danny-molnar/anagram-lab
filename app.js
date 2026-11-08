import {normalize} from './solver.js';
const $ = id => document.getElementById(id), form = $('form');
let worker, results = [], known = new Set(), busy = false, ready = false;
function setBusy(value) { busy = value; $('solve').disabled = value || !ready; $('stop').hidden = !value; $('results-stop').hidden = !value; }
function startWorker() {
  ready = false; setBusy(false);
  worker = new Worker(new URL('./worker.js', import.meta.url), {type:'module'});
  worker.onmessage = ({data}) => {
    if (data.type === 'ready') { ready = true; $('dictionary-status').textContent = `${data.count.toLocaleString()} words · Phrase & frequency ranking ready`; setBusy(false); }
    if (data.type === 'batch') { results.push(...data.results); for (const phrase of data.known) known.add(phrase); render(); }
    if (data.type === 'done') {
      setBusy(false);
      $('status').textContent = `${results.length} ${results.length === 1 ? 'combination' : 'combinations'} found in ${(data.elapsed / 1000).toFixed(2)}s.${data.limited ? ` Search stopped at the ${data.reason === 'time' ? '6-second time' : data.reason === 'frontier' ? 'search-memory' : '500-result'} limit; results are partial. Narrow your filters to explore further.` : ' Search complete.'} Known phrases first, then common-word combinations.`;
      if (!results.length) $('results').textContent = 'No matches. Try allowing more words, reducing the minimum length, or removing constraints.';
    }
    if (data.type === 'error') { setBusy(false); $('status').textContent = data.message; }
  };
  worker.onerror = () => { worker.terminate(); ready = false; setBusy(false); $('dictionary-status').textContent = 'Dictionary unavailable. Reload to retry; use an HTTP server rather than opening the file directly.'; $('status').textContent = 'Could not start the solver.'; };
  worker.postMessage({type:'init'});
}
function render() {
  $('badge').textContent = results.length; $('toolbar').hidden = !results.length;
  const fragment = document.createDocumentFragment(), filter = $('filter').value.toLowerCase();
  for (const words of results) {
    const phrase = words.join(' '); if (!phrase.includes(filter)) continue;
    const row = document.createElement('div'); row.className = 'result-row';
    const text = document.createElement('span'); text.textContent = phrase;
    if (known.has(phrase)) {
      row.classList.add('known-phrase');
      const label = document.createElement('small'); label.className = 'phrase-label'; label.textContent = 'Known phrase'; text.append(label);
    }
    const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'copy'; copy.textContent = 'Copy'; copy.setAttribute('aria-label', `Copy ${phrase}`);
    copy.onclick = async () => { try { await navigator.clipboard.writeText(phrase); copy.textContent = 'Copied'; } catch { copy.textContent = 'Select to copy'; } };
    row.append(text, copy); fragment.append(row);
  }
  $('results').replaceChildren(fragment);
}
function countLetters() { $('letter-count').textContent = `${normalize($('letters').value).length} letters`; }
form.onsubmit = event => {
  event.preventDefault(); if (busy || !ready) return;
  const options = Object.fromEntries(new FormData(form)); options.max = $('max').value; options.exact = $('exact').value;
  results = []; known = new Set(); $('filter').value = ''; render(); setBusy(true); $('status').textContent = 'Looking for letter-perfect combinations…';
  worker.postMessage({type:'solve', options});
  if (window.matchMedia('(max-width: 820px)').matches) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    requestAnimationFrame(() => $('results-section').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start'
    }));
  }
};
$('results-stop').onclick = $('stop').onclick = () => { worker.terminate(); $('status').textContent = `Search stopped. ${results.length} combinations found; results are partial.`; startWorker(); };
$('letters').oninput = countLetters; $('filter').oninput = render;
for (const radio of form.elements.mode) radio.onchange = () => {
  const single = form.elements.mode.value === 'single'; $('max').disabled = single; $('exact').disabled = single;
};
for (const button of document.querySelectorAll('[data-example]')) button.onclick = () => {
  if (busy) return;
  $('letters').value = button.dataset.example; form.elements.mode.value = button.dataset.mode;
  form.elements.mode[0].onchange(); $('required').value = ''; $('excluded').value = ''; $('min').value = '2'; $('max').value = '3'; $('exact').value = '0'; countLetters();
  if (ready) form.requestSubmit();
};
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([results.map(words => words.join(' ')).join('\n')], {type:'text/plain'}));
  const link = document.createElement('a'); link.href = url; link.download = 'anagrams.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
startWorker(); countLetters();
