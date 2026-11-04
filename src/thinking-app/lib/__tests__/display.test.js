import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DISPLAYS, preferredDisplay } from '../display.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
});

test('表示は立体・文字・カメラの3つ', () => {
  assert.deepEqual(DISPLAYS.map(d => d.key), ['scene', 'text', 'camera']);
});

test('画面で見るときは、前回選んだ文字表示か、それ以外なら立体表示', () => {
  assert.equal(preferredDisplay(), 'scene');
  localStorage.setItem('chakugan.display.v1', JSON.stringify('text'));
  assert.equal(preferredDisplay(), 'text');
  localStorage.setItem('chakugan.display.v1', JSON.stringify('camera'));
  assert.equal(preferredDisplay(), 'scene', 'カメラは前回の表示として使わない');
});
