import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initProgress, progressReducer, nextFocusId, hasPending, revealedTotal, isComplete } from '../progress.js';
import { normalizeProblem } from '../model.js';
import { validProblem } from './fixtures.js';

const problem = normalizeProblem(validProblem()); // f1: 気づき1個、f2: 気づき2個
const run = (actions, promptFirst = false) =>
  actions.reduce((s, a) => progressReducer(s, { promptFirst, ...a }), initProgress(problem));
const sel = (id) => ({ type: 'select', id });
const adv = { type: 'advance' };

test('初期状態', () => {
  const s = initProgress(problem);
  assert.equal(s.shown, false);
  assert.equal(s.activeId, null);
  assert.equal(nextFocusId(s), 'f1');
  assert.equal(isComplete(s), false);
});

test('通常: 選ぶと最初の気づきが出て、もう一度選ぶと次の気づきが出る', () => {
  let s = run([sel('f2')]);
  assert.equal(s.shown, true);
  assert.equal(s.activeId, 'f2');
  assert.deepEqual(s.focus.f2, { opened: 1, revealed: 1 });
  s = progressReducer(s, sel('f2'));
  assert.deepEqual(s.focus.f2, { opened: 2, revealed: 2 });
  s = progressReducer(s, sel('f2'));
  assert.deepEqual(s.focus.f2, { opened: 2, revealed: 2 }, '全部出したらそれ以上増えない');
});

test('開いたことのある別の注目箇所を選んでも、気づきは増えない', () => {
  const s = run([sel('f2'), sel('f1'), sel('f2')]);
  assert.equal(s.activeId, 'f2');
  assert.deepEqual(s.focus.f2, { opened: 1, revealed: 1 });
});

test('advance は開いている注目箇所だけを進める', () => {
  assert.deepEqual(run([adv]).focus, initProgress(problem).focus, '何も開いていなければ変わらない');
  assert.deepEqual(run([sel('f2'), adv]).focus.f2, { opened: 2, revealed: 2 });
});

test('考えてから見る: 1回目で問いかけ、2回目で答えが出る', () => {
  let s = run([sel('f2')], true);
  assert.deepEqual(s.focus.f2, { opened: 1, revealed: 0 });
  assert.equal(hasPending(s, 'f2'), true);
  s = progressReducer(s, { type: 'select', id: 'f2', promptFirst: true });
  assert.deepEqual(s.focus.f2, { opened: 1, revealed: 1 });
  s = progressReducer(s, { type: 'advance', promptFirst: true });
  assert.deepEqual(s.focus.f2, { opened: 2, revealed: 1 });
  s = progressReducer(s, { type: 'advance', promptFirst: true });
  assert.deepEqual(s.focus.f2, { opened: 2, revealed: 2 });
});

test('考えてから見るをやめると、出ている問いかけの答えを出す', () => {
  const s = progressReducer(run([sel('f2')], true), { type: 'revealPending' });
  assert.deepEqual(s.focus.f2, { opened: 1, revealed: 1 });
});

test('問いかけが出ている状態で通常に戻して進めても、答えを飛ばさない', () => {
  const s = progressReducer(run([sel('f2')], true), { type: 'advance', promptFirst: false });
  assert.deepEqual(s.focus.f2, { opened: 1, revealed: 1 });
});

test('次に見る注目箇所・完了・合計', () => {
  let s = run([sel('f1')]);
  assert.equal(nextFocusId(s), 'f2');
  s = run([sel('f1'), sel('f2'), sel('f2')]);
  assert.equal(nextFocusId(s), null);
  assert.equal(revealedTotal(s), 3);
  assert.equal(isComplete(s), true);
});

test('最初からやり直す', () => {
  const s = progressReducer(run([sel('f1'), sel('f2')]), { type: 'reset' });
  assert.deepEqual(s, initProgress(problem));
});

test('存在しない注目箇所や未知の操作では状態が変わらない', () => {
  const s = initProgress(problem);
  assert.equal(progressReducer(s, sel('none')), s);
  assert.equal(progressReducer(s, { type: 'unknown' }), s);
});
