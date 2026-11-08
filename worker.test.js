import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('worker loads bundled data and streams recognised phrases before completion', async () => {
  const oldFetch = globalThis.fetch, oldSelf = globalThis.self, messages = [];
  globalThis.self = {postMessage: message => messages.push(message)};
  globalThis.fetch = async path => ({ok:true, text:() => readFile(new URL(path, import.meta.url), 'utf8')});
  try {
    await import('./worker.js');
    await self.onmessage({data:{type:'init'}});
    assert.equal(messages[0].type, 'ready');
    assert(messages[0].count > 300000);
    await self.onmessage({data:{type:'solve',options:{text:'s white grapes',min:2,max:3,limit:1}}});
    assert.equal(messages[1].type, 'batch');
    assert.deepEqual(messages[1].results, [['stage','whisper']]);
    assert.deepEqual(messages[1].known, ['stage whisper']);
    assert.equal(messages[2].type, 'done');
    assert.equal(messages[2].reason, 'results');
  } finally {
    globalThis.fetch = oldFetch; globalThis.self = oldSelf;
  }
});
