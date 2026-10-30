import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { emptyDraft, fromData, toData, formatJson, occurrenceAt, countOccurrences, nextFocusIdFor } from '../serialize.js';
import { validateThinking } from '../schema.js';
import { validProblem } from './fixtures.js';

const DATA_DIR = new URL('../../data/', import.meta.url);

test('同梱のデータは作成ツールで読み込んで書き出しても内容が変わらない', () => {
  for (const file of readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(new URL(file, DATA_DIR), 'utf8'));
    assert.deepEqual(toData(fromData(data)), data, file);
  }
});

test('書き出す JSON は手書きのデータファイルと同じ体裁になる', () => {
  const text = readFileSync(new URL('probability_001.json', DATA_DIR), 'utf8');
  assert.equal(formatJson(JSON.parse(text)), text);
});

test('書き出しでは並び順から優先順位を振り直し、空の任意項目を省く', () => {
  const draft = fromData(validProblem());
  draft.focuses.reverse();
  draft.origin = '  ';
  draft.meta.model = 'x';
  const data = toData(draft);
  assert.deepEqual(data.focuses.map(f => [f.id, f.priority]), [['f2', 1], ['f1', 2]]);
  assert.deepEqual(data.focuses[0].insights.map(s => s.priority), [1, 2]);
  assert.equal('origin' in data, false);
  assert.equal('model' in data.meta, false, '手作業のデータには model を出さない');
  assert.equal('occurrence' in data.focuses[0], false, '1番目の出現なら occurrence を省く');
});

test('formatJson は JSON として読み戻せる', () => {
  const data = toData(fromData(validProblem()));
  assert.deepEqual(JSON.parse(formatJson(data)), data);
  const empty = toData(emptyDraft());
  assert.deepEqual(JSON.parse(formatJson(empty)), empty);
});

test('壊れた入力でも作成ツールで扱える形にする', () => {
  for (const input of [null, 'text', 1, [], { focuses: 'x', meta: 'y' }, { focuses: [null, { insights: [null] }] }]) {
    const draft = fromData(input);
    assert.ok(Array.isArray(draft.focuses));
    assert.equal(typeof draft.meta, 'object');
    assert.doesNotThrow(() => toData(draft));
  }
});

test('白紙の下書きは検証でエラーになる（題名・問題文・注目箇所がない）', () => {
  const { errors } = validateThinking(toData(emptyDraft()));
  assert.ok(errors.some(e => /title/.test(e)));
  assert.ok(errors.some(e => /problem/.test(e)));
  assert.ok(errors.some(e => /focuses/.test(e)));
});

test('引用の出現回数と、選択位置が何番目の出現か', () => {
  const text = 'x² + y² と x² の値';
  assert.equal(countOccurrences(text, 'x²'), 2);
  assert.equal(countOccurrences(text, ''), 0);
  assert.equal(occurrenceAt(text, 'x²', 0), 1);
  assert.equal(occurrenceAt(text, 'x²', text.lastIndexOf('x²')), 2);
});

test('使われていない注目箇所ID', () => {
  assert.equal(nextFocusIdFor({ focuses: [] }), 'f1');
  assert.equal(nextFocusIdFor({ focuses: [{ id: 'f1' }, { id: 'f3' }] }), 'f2');
});
