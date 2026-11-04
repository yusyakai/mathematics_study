import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProblem } from '../model.js';
import { focusColor } from '../colors.js';
import {
  endShown, linkStates, marksFor, splitByMarks, endLabel, assignLanes, connectorPath,
  swapInsightRefs, removeInsightRefs, removeFocusRefs, countRefs, phraseCandidates,
} from '../links.js';
import { validProblem } from './fixtures.js';

// ①「確率を求めよ」の気づき「場合の数の比で求める」の「場合の数」は、②「2個取り出す」の気づき「nCr で数える」の「nCr」でわかる
const problem = () => {
  const data = validProblem();
  data.links = [{ term: { focus: 'f1', insight: 1, text: '場合の数' }, source: { focus: 'f2', insight: 2, text: 'nCr' } }];
  return normalizeProblem(data);
};
const progress = (f1, f2) => ({ f1: { opened: f1[0], revealed: f1[1] }, f2: { opened: f2[0], revealed: f2[1] } });

test('気づきの端は答えが出たとき、引用の端は注目箇所を開いたときに出る', () => {
  const p = problem();
  const [link] = p.resolvedLinks;
  assert.equal(endShown(p, progress([1, 0], [0, 0]), link.term), false, '問いかけだけでは出ない');
  assert.equal(endShown(p, progress([1, 1], [0, 0]), link.term), true);
  assert.equal(endShown(p, progress([1, 1], [1, 1]), link.source), false, '②の2個目の気づきはまだ');
  assert.equal(endShown(p, progress([0, 0], [1, 0]), { focusIndex: 1, insightIndex: -1 }), true, '引用は開けば出る');
});

test('両方の端が出るとつながりが見え、色はわかる側の注目箇所の色', () => {
  const p = problem();
  const [partial] = linkStates(p, progress([1, 1], [1, 1]));
  assert.equal(partial.termShown, true);
  assert.equal(partial.complete, false);
  const [complete] = linkStates(p, progress([1, 1], [2, 2]));
  assert.equal(complete.complete, true);
  assert.equal(complete.color, focusColor(1));
});

test('語句の側は先に「あとでわかる」印が付き、わかる側はつながりが見えてから印が付く', () => {
  const p = problem();
  const partial = linkStates(p, progress([1, 1], [1, 1]));
  assert.deepEqual(marksFor(partial, 0, 0).map(m => [m.span, m.ends.map(e => [e.role, e.complete])]), [[[0, 4], [['term', false]]]]);
  assert.deepEqual(marksFor(partial, 1, 1), [], 'わかる側にはまだ印を付けない');
  const complete = linkStates(p, progress([1, 1], [2, 2]));
  const [mark] = marksFor(complete, 1, 1);
  assert.deepEqual(mark.span, [0, 3]);
  assert.equal(mark.ends[0].other, p.resolvedLinks[0].term, 'わかる側の印は語句の側を指す');
});

test('同じ語句を指す端は1つの印にまとめる', () => {
  const data = validProblem();
  data.links = [
    { term: { focus: 'f1', insight: 1, text: '場合の数' }, source: { focus: 'f2', insight: 2, text: 'nCr' } },
    { term: { focus: 'f1', insight: 1, text: '場合の数' }, source: { focus: 'f2' } },
  ];
  const p = normalizeProblem(data);
  const marks = marksFor(linkStates(p, progress([1, 1], [2, 2])), 0, 0);
  assert.equal(marks.length, 1);
  assert.deepEqual(marks[0].ends.map(e => e.key), ['0-term', '1-term']);
});

test('文を印の範囲で区切り、つなげると元の文になる', () => {
  const text = '場合の数の比で求める';
  const segments = splitByMarks(text, [{ span: [5, 6] }, { span: [0, 4] }, { span: null }]);
  assert.deepEqual(segments.map(s => [s.text, Boolean(s.mark)]), [['場合の数', true], ['の', false], ['比', true], ['で求める', false]]);
  assert.equal(segments.map(s => s.text).join(''), text);
});

test('端の呼び名は語句、なければ文の書き出し', () => {
  const p = problem();
  assert.equal(endLabel(p, p.resolvedLinks[0].source), 'nCr');
  assert.equal(endLabel(p, { focusIndex: 1, insightIndex: -1, text: null }), '2個取り出す');
  assert.equal(endLabel(p, { focusIndex: 1, insightIndex: 0, text: null }, 3), '順番は…');
});

test('上下に短いつながりほど内側のレーンにする', () => {
  assert.deepEqual(assignLanes([{ index: 0, fromY: 400, toY: 20 }, { index: 1, fromY: 120, toY: 60 }]), { 1: 0, 0: 1 });
});

test('線は文の右端からレーンを通って結び、矢じりは語句の側に付く', () => {
  const { d, head, dot } = connectorPath(200, 40, 300, 320);
  assert.ok(d.startsWith('M 303 200'), d);
  assert.ok(d.includes('V 46'), '上向きに曲がってから縦に進む');
  assert.ok(d.endsWith('H 308'), d);
  assert.ok(head.startsWith('M 302 40'));
  assert.deepEqual(dot, { x: 303, y: 200 });
  assert.ok(connectorPath(40, 41, 300, 320).d.includes('V 41'), '高さがほぼ同じなら角を丸めない');
});

test('作成ツールで気づきを並べ替え・削除しても、つながりは同じ気づきを指す', () => {
  const links = [
    { term: { focus: 'f1', insight: 1, text: 'a' }, source: { focus: 'f2', insight: 3, text: 'b' } },
    { term: { focus: 'f1', insight: 2, text: 'c' }, source: { focus: 'f2', insight: null, text: '' } },
  ];
  const swapped = swapInsightRefs(links, 'f1', 1, 2);
  assert.deepEqual(swapped.map(l => l.term.insight), [2, 1]);
  assert.equal(swapped[1].source.insight, null, '引用を指す端は変えない');

  const removed = removeInsightRefs(links, 'f2', 2);
  assert.deepEqual(removed.map(l => l.source.insight), [2, null], '後ろの気づきの番号を詰める');
  assert.deepEqual(removeInsightRefs(links, 'f1', 1).map(l => l.term.text), ['c'], '消した気づきを指すつながりは消す');
  assert.equal(removeInsightRefs(links, 'f1', 1)[0].term.insight, 1);

  assert.deepEqual(removeFocusRefs(links, 'f2'), []);
  assert.equal(countRefs(links, 'f1'), 2);
  assert.equal(countRefs(links, 'f2', 3), 1);
});

test('語句の候補は文を記号・区切りで分けた部分', () => {
  assert.deepEqual(phraseCandidates('（あてはまる場合の数）÷（全体の場合の数）で求める'), ['あてはまる場合の数', '全体の場合の数', 'で求める']);
  assert.deepEqual(phraseCandidates('全体の場合の数は、8個から2個を選ぶ ₈C₂ 通り'), ['全体の場合の数は', '8個から2個を選ぶ', '₈C₂', '通り']);
  assert.deepEqual(phraseCandidates(''), []);
});
