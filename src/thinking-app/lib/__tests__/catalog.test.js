import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUBJECTS, DIFFICULTIES, ROLES, KINDS, KIND_DECISION_STEPS, SOURCES, promptFor } from '../catalog.js';

test('科目ごとの単元は空でなく、重複しない', () => {
  for (const [subject, units] of Object.entries(SUBJECTS)) {
    assert.ok(units.length > 0, subject);
    assert.equal(new Set(units).size, units.length, subject);
  }
});

test('選択肢にはすべて表示名と説明がある', () => {
  for (const group of [DIFFICULTIES, ROLES, KINDS]) {
    for (const [key, item] of Object.entries(group)) {
      assert.ok(item.label, key);
      assert.ok(item.description, key);
    }
  }
  for (const [key, item] of Object.entries(SOURCES)) assert.ok(item.label, key);
});

test('種類の判断順はすべての種類を1回ずつ含む', () => {
  assert.deepEqual(KIND_DECISION_STEPS.map(s => s.kind).sort(), Object.keys(KINDS).sort());
});

test('問いかけの文には手がかりの語句が入る', () => {
  for (const kind of Object.keys(KINDS)) {
    assert.ok(KINDS[kind].prompt.includes('{cue}'), kind);
    assert.ok(promptFor({ kind, cue: '取り出す' }).includes('「取り出す」'), kind);
  }
});
