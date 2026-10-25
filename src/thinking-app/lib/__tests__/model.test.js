import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProblem, insightTotal } from '../model.js';
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
