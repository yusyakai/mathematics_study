// データ仕様書（docs/thinking-app/data-spec.md）が catalog.js の選択肢と食い違っていないかを確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SUBJECTS, DIFFICULTIES, ROLES, KINDS } from '../catalog.js';
import { SCHEMA_VERSION } from '../schema.js';

const doc = readFileSync(new URL('../../../../docs/thinking-app/data-spec.md', import.meta.url), 'utf8');

test('仕様書の科目・単元の表は catalog.js と一致する', () => {
  for (const [subject, units] of Object.entries(SUBJECTS)) {
    const row = doc.split('\n').find(line => line.startsWith(`| ${subject} |`));
    assert.ok(row, `${subject} の行がない`);
    const docUnits = row.split('|')[2].trim().split('、');
    assert.deepEqual(docUnits, units, subject);
  }
});

test('仕様書に役割・種類・難易度・形式の版が載っている', () => {
  for (const key of [...Object.keys(ROLES), ...Object.keys(KINDS)]) assert.ok(doc.includes(`\`${key}\``), key);
  for (const [key, d] of Object.entries(DIFFICULTIES)) assert.ok(doc.includes(`| ${key} | ${d.label} | ${d.description} |`), key);
  assert.ok(doc.includes(`schemaVersion: ${SCHEMA_VERSION}`));
});
