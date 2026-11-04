import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildAiPrompt } from '../aiPrompt.js';
import { extractJson } from '../serialize.js';
import { validateThinking } from '../schema.js';
import { SUBJECTS, ROLES, KINDS } from '../catalog.js';

test('指示文にすべての科目・単元・役割・種類が入る（catalog.js と食い違わない）', () => {
  const prompt = buildAiPrompt();
  for (const [subject, units] of Object.entries(SUBJECTS)) {
    assert.ok(prompt.includes(`${subject}（${units.join('、')}）`), subject);
  }
  for (const key of [...Object.keys(ROLES), ...Object.keys(KINDS)]) assert.ok(prompt.includes(key), key);
});

test('問題文を入れると指示文の最後に入る', () => {
  assert.ok(buildAiPrompt('1 + 1 を求めよ。').trimEnd().endsWith('問題文：1 + 1 を求めよ。'));
  assert.ok(buildAiPrompt().includes('（ここに問題文を貼る）'));
});

test('指示文の例は読み込める形式で、管理情報は AI生成・未確認になっている', () => {
  const data = JSON.parse(extractJson(buildAiPrompt().split('# 出力の形式（例）')[1]));
  assert.deepEqual(validateThinking(data).errors, []);
  assert.equal(data.meta.source, 'ai');
  assert.equal(data.meta.reviewed, false);
  // モデル名は空にさせ、作成ツールで人が入れる（入れるまで警告が出る）
  assert.ok(validateThinking(data).warnings.some(w => w.includes('meta.model')));
});

test('AI の出力から JSON の部分を取り出す', () => {
  const json = '{ "a": { "b": 1 } }';
  assert.equal(extractJson(json), json);
  assert.equal(extractJson(`作りました。\n\`\`\`json\n${json}\n\`\`\`\nご確認ください。`), json);
  assert.equal(extractJson(`以下です：${json} 以上です。`), json);
  assert.equal(extractJson('  JSON なし  '), 'JSON なし');
});

test('つながりは任意の項目として指示文に入り、例の形式は検証を通る', () => {
  const prompt = buildAiPrompt();
  assert.ok(prompt.includes('# つながり（links、任意）'));
  const example = JSON.parse(prompt.match(/例：(\{ "term".*\})/)[1]);
  const data = JSON.parse(readFileSync(new URL('../../data/probability_001.json', import.meta.url), 'utf8'));
  data.links = [example];
  assert.deepEqual(validateThinking(data).errors, [], '例のつながりは probability_001 に当てはまる');
});
