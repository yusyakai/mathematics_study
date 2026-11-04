import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shortcutAction } from '../shortcuts.js';

const key = (k, extra = {}) => ({ key: k, target: { tagName: 'BODY' }, ...extra });

test('数字キーで注目箇所を選ぶ（注目箇所の数まで）', () => {
  assert.deepEqual(shortcutAction(key('1'), 4), { type: 'select', index: 0 });
  assert.deepEqual(shortcutAction(key('4'), 4), { type: 'select', index: 3 });
  assert.equal(shortcutAction(key('5'), 4), null);
  assert.equal(shortcutAction(key('0'), 4), null);
});

test('→ と N で次へ', () => {
  for (const k of ['ArrowRight', 'n', 'N']) assert.deepEqual(shortcutAction(key(k), 3), { type: 'next' });
  assert.equal(shortcutAction(key('ArrowLeft'), 3), null);
});

test('入力中や修飾キーとの組み合わせでは反応しない', () => {
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) assert.equal(shortcutAction(key('1', { target: { tagName } }), 3), null);
  assert.equal(shortcutAction(key('1', { target: { tagName: 'DIV', isContentEditable: true } }), 3), null);
  assert.equal(shortcutAction(key('n', { ctrlKey: true }), 3), null);
  assert.equal(shortcutAction(key('1', { metaKey: true }), 3), null);
});
