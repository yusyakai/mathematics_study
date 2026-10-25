import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadDrafts, loadDraft, saveDraft, deleteDraft, newDraftKey, checkDraft } from '../drafts.js';
import { emptyDraft, fromData } from '../serialize.js';
import { validProblem } from './fixtures.js';

// localStorage の代わり
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('下書きを保存・読み込み・削除できる', () => {
  const draft = fromData(validProblem());
  saveDraft('a', draft);
  assert.deepEqual(loadDraft('a'), draft);
  assert.deepEqual(loadDrafts().map(d => d.key), ['a']);
  deleteDraft('a');
  assert.equal(loadDraft('a'), null);
  assert.deepEqual(loadDrafts(), []);
});

test('下書きの一覧は更新の新しい順', async () => {
  saveDraft('old', emptyDraft());
  await new Promise(r => setTimeout(r, 5));
  saveDraft('new', emptyDraft());
  assert.deepEqual(loadDrafts().map(d => d.key), ['new', 'old']);
});

test('壊れた下書きも形を整えて読み込む', () => {
  localStorage.setItem('chakugan.drafts.v1', JSON.stringify({ x: { draft: { focuses: 'broken', meta: null } } }));
  const draft = loadDraft('x');
  assert.deepEqual(draft.focuses, []);
  assert.equal(draft.meta.source, 'manual');
  assert.doesNotThrow(() => checkDraft(draft));
});

test('保存できない環境でも例外にしない', () => {
  globalThis.localStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.doesNotThrow(() => saveDraft('a', emptyDraft()));
  assert.equal(loadDraft('a'), null);
});

test('下書きのキーは毎回異なる', () => {
  assert.notEqual(newDraftKey(), newDraftKey());
});

test('検証を通った下書きは、画面で使える形（下書きの印つき）になる', () => {
  const ok = checkDraft(fromData(validProblem()));
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.problem.draft, true);
  assert.deepEqual(ok.problem.focuses.map(f => f.id), ['f1', 'f2']);
  const ng = checkDraft(emptyDraft());
  assert.ok(ng.errors.length > 0);
  assert.equal(ng.problem, null);
});
