import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateThinking, locateQuote, THINKING_JSON_SCHEMA, SCHEMA_VERSION, LIMITS } from '../schema.js';
import { SUBJECTS, DIFFICULTIES, ROLES, KINDS, SOURCES } from '../catalog.js';
import { validProblem } from './fixtures.js';

const DATA_DIR = new URL('../../data/', import.meta.url);

// data を変更して検証し、メッセージに pattern を含むエラー（または警告）があるか確かめる
const expectMessage = (type, mutate, pattern) => {
  const data = validProblem();
  mutate(data);
  const result = validateThinking(data);
  assert.ok(result[type].some(m => pattern.test(m)), `${type} に ${pattern} がない: ${JSON.stringify(result)}`);
};
const expectError = (mutate, pattern) => expectMessage('errors', mutate, pattern);
const expectWarning = (mutate, pattern) => expectMessage('warnings', mutate, pattern);

test('正しいデータはエラーも警告もない', () => {
  assert.deepEqual(validateThinking(validProblem()), { errors: [], warnings: [] });
});

// 警告は「使えるが見直し推奨」なので失敗にはしない（npm run validate:thinking で確認できる）
test('同梱の問題データはすべてエラーがなく、ファイル名が id と一致する', () => {
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  assert.ok(files.length > 0);
  for (const file of files) {
    const data = JSON.parse(readFileSync(new URL(file, DATA_DIR), 'utf8'));
    assert.deepEqual(validateThinking(data).errors, [], file);
    assert.equal(file, `${data.id}.json`);
  }
});

test('オブジェクトでないデータはエラー', () => {
  for (const value of [null, 'text', 1, []]) {
    assert.equal(validateThinking(value).errors.length, 1);
  }
});

test('基本情報のエラー', () => {
  expectError(d => { d.schemaVersion = 3; }, /schemaVersion/);
  expectError(d => { d.id = 'Sample-1'; }, /半角英小文字/);
  expectError(d => { d.id = ''; }, /id が空/);
  expectError(d => { d.title = ' '; }, /title/);
  expectError(d => { d.problem = ''; }, /problem/);
  expectError(d => { d.subject = '算数'; }, /subject/);
  expectError(d => { d.unit = '二次関数'; }, /unit.*数学A の単元/);
  expectError(d => { d.difficulty = 'D'; }, /difficulty/);
  expectError(d => { d.origin = 1; }, /origin/);
});

test('管理情報のエラーと警告', () => {
  expectError(d => { delete d.meta; }, /meta/);
  expectError(d => { d.meta.source = 'human'; }, /meta.source/);
  expectError(d => { d.meta.reviewed = 'yes'; }, /meta.reviewed/);
  expectWarning(d => { d.meta.source = 'ai'; }, /meta.model/);
});

test('注目箇所のエラー', () => {
  expectError(d => { d.focuses = []; }, /focuses/);
  expectError(d => { d.focuses[0].quote = '3個取り出す'; }, /見つかりません/);
  expectError(d => { d.focuses[0].quote = '個取り出す'; d.focuses[1].quote = '2個取り出す'; d.focuses[1].insights[0].cue = '取り出す'; }, /重なっています/);
  expectError(d => { d.focuses[0].role = 'goal'; }, /role/);
  expectError(d => { d.focuses[0].priority = 1; }, /priority 1 が他の注目箇所と重複/);
  expectError(d => { d.focuses[0].priority = 1.5; }, /1以上の整数/);
  expectError(d => { d.focuses[0].id = 'f1'; }, /"f1" が重複/);
  expectError(d => { d.focuses[0].id = 'f 2'; }, /半角英数字/);
  expectError(d => { d.focuses[0].occurrence = 0; }, /occurrence/);
  expectError(d => { d.focuses[0].occurrence = 2; }, /見つかりません/);
  expectError(d => { d.focuses[0].insights = []; }, /insights/);
});

test('気づきのエラー', () => {
  expectError(d => { d.focuses[0].insights[0].kind = 'plan'; }, /kind/);
  expectError(d => { d.focuses[0].insights[0].cue = '赤玉'; }, /cue「赤玉」は注目箇所の引用「2個取り出す」の一部/);
  expectError(d => { d.focuses[0].insights[0].cue = ''; }, /cue.*空/);
  expectError(d => { d.focuses[0].insights[0].thought = ''; }, /thought/);
  expectError(d => { d.focuses[0].insights[0].priority = 1; }, /同じ注目箇所の中で重複/);
  expectError(d => { d.focuses[0].insights[0] = null; }, /オブジェクトではありません/);
});

test('内容の質の警告', () => {
  expectWarning(d => { d.focuses[0].insights[0].thought = 'あ'.repeat(LIMITS.thoughtLength + 1); }, /字以内/);
  expectWarning(d => {
    d.focuses[0].insights = Array.from({ length: LIMITS.insightsPerFocus + 1 }, (_, i) => ({ priority: i + 1, kind: 'interpret', cue: '取り出す', thought: `考え${i}` }));
  }, /気づきが \d+ 個/);
  expectWarning(d => { d.focuses[1].role = 'condition'; }, /問い/);
  expectWarning(d => { d.focuses.forEach(f => f.insights.forEach(s => { s.kind = 'interpret'; })); }, /解法の選択/);
  expectWarning(d => { d.focuses[0].priority = 3; }, /1 から順に並んでいません/);
  expectWarning(d => { d.focuses[0].insights[0].priority = 5; }, /気づきの priority が 1 から順/);
  expectWarning(d => { d.focuses[0].insights[0].thought = d.focuses[0].insights[1].thought; }, /同じ内容/);
});

test('locateQuote は出現順と範囲を考慮する', () => {
  const text = 'abcabcabc';
  assert.deepEqual(locateQuote(text, 'abc'), [0, 3]);
  assert.deepEqual(locateQuote(text, 'abc', 2), [3, 6]);
  assert.equal(locateQuote(text, 'abc', 4), null);
  assert.deepEqual(locateQuote(text, 'b', 1, 4, 9), [4, 5]);
  assert.equal(locateQuote(text, 'abc', 1, 1, 5), null);
});

test('JSON Schema の選択肢は catalog と一致する', () => {
  const p = THINKING_JSON_SCHEMA.properties;
  assert.deepEqual(p.schemaVersion.enum, [SCHEMA_VERSION]);
  assert.deepEqual(p.subject.enum, Object.keys(SUBJECTS));
  assert.deepEqual(p.difficulty.enum, Object.keys(DIFFICULTIES));
  assert.deepEqual(p.focuses.items.properties.role.enum, Object.keys(ROLES));
  assert.deepEqual(p.focuses.items.properties.insights.items.properties.kind.enum, Object.keys(KINDS));
  assert.deepEqual(p.meta.properties.source.enum, Object.keys(SOURCES));
});

test('JSON Schema の必須項目は正しいデータにすべて含まれる', () => {
  const data = validProblem();
  for (const key of THINKING_JSON_SCHEMA.required) assert.ok(key in data, key);
  for (const key of THINKING_JSON_SCHEMA.properties.focuses.items.required) assert.ok(key in data.focuses[0], key);
  for (const key of THINKING_JSON_SCHEMA.properties.focuses.items.properties.insights.items.required) {
    assert.ok(key in data.focuses[0].insights[0], key);
  }
});
