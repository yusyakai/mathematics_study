import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProblem, insightTotal, problemSegments, sortProblems, nextProblem } from '../model.js';
import { validProblem } from './fixtures.js';

test('注目箇所と気づきを優先順位順に並べる', () => {
  const p = normalizeProblem(validProblem());
  assert.deepEqual(p.focuses.map(f => f.id), ['f1', 'f2']);
  assert.deepEqual(p.focuses[1].insights.map(s => s.thought), ['順番は関係ない', 'nCr で数える']);
});

test('注目箇所の位置と、手がかりの語句の位置を注目箇所の中から求める', () => {
  const data = validProblem();
  const p = normalizeProblem(data);
  const f2 = p.focuses.find(f => f.id === 'f2');
  assert.equal(data.problem.slice(...f2.span), '2個取り出す');
  assert.equal(data.problem.slice(...f2.insights[0].cueSpan), '取り出す');
  // 「確率」は問題文に1回だけだが、注目箇所の範囲の中で探していることを確かめる
  const f1 = p.focuses.find(f => f.id === 'f1');
  assert.ok(f1.insights[0].cueSpan[0] >= f1.span[0] && f1.insights[0].cueSpan[1] <= f1.span[1]);
});

test('同じ語句が注目箇所より前にもあるとき、注目箇所の中の位置を使う', () => {
  const data = validProblem();
  data.problem = '2個とも赤玉。赤玉3個から2個取り出す。確率を求めよ。';
  data.focuses[0].quote = '赤玉3個から2個取り出す';
  data.focuses[0].insights[0].cue = '赤玉';
  const f = normalizeProblem(data).focuses.find(x => x.id === 'f2');
  const cue = f.insights.find(s => s.cue === '赤玉');
  assert.equal(cue.cueSpan[0], data.problem.indexOf('赤玉3個'));
});

test('元のデータを書き換えない', () => {
  const data = validProblem();
  const before = JSON.stringify(data);
  normalizeProblem(data);
  assert.equal(JSON.stringify(data), before);
});

test('気づきの総数', () => {
  assert.equal(insightTotal(normalizeProblem(validProblem())), 3);
});

test('問題文を注目箇所とそれ以外に分け、つなげると元の問題文になる', () => {
  const p = normalizeProblem(validProblem());
  const segments = problemSegments(p);
  assert.equal(segments.map(s => s.text).join(''), p.problem);
  const marked = segments.filter(s => s.index !== undefined);
  assert.deepEqual(marked.map(s => s.text), ['2個取り出す', '確率を求めよ'], '問題文の中の順に並ぶ');
  assert.deepEqual(marked.map(s => s.index), [1, 0], 'index は優先順位の番号');
});

const item = (id, subject, unit, difficulty) => ({ id, subject, unit, difficulty });

test('一覧は科目・単元の順、単元の中は難易度・IDの順に並べる', () => {
  const sorted = sortProblems([
    item('prob_b', '数学A', '確率', 'B'),
    item('quad_1', '数学I', '二次関数', 'C'),
    item('prob_a2', '数学A', '確率', 'C'),
    item('sym_1', '数学I', '数と式', 'C'),
    item('prob_a1', '数学A', '確率', 'C'),
  ]);
  assert.deepEqual(sorted.map(p => p.id), ['sym_1', 'quad_1', 'prob_a1', 'prob_a2', 'prob_b']);
});

test('次の問題は、後ろにあるまだ完了していない問題（なければ一覧の次）', () => {
  const list = ['a', 'b', 'c', 'd'].map(id => ({ id }));
  assert.equal(nextProblem(list, 'a', {}).id, 'b');
  assert.equal(nextProblem(list, 'a', { b: '2026-01-01' }).id, 'c');
  assert.equal(nextProblem(list, 'c', { d: '2026-01-01' }).id, 'a', '最後まで行ったら先頭に戻る');
  assert.equal(nextProblem(list, 'b', { a: 1, b: 1, c: 1, d: 1 }).id, 'c', 'すべて完了なら一覧の次');
  assert.equal(nextProblem([{ id: 'a' }], 'a', {}), null);
  assert.equal(nextProblem(list, 'draft', {}), null, '一覧にない問題（下書き）');
});
