import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceToRect, hitTestFocus, rectsForSpan } from '../geometry.js';

const rect = { x: 100, y: 100, w: 50, h: 20 };

test('点と矩形の距離', () => {
  assert.equal(distanceToRect(120, 110, rect), 0);
  assert.equal(distanceToRect(90, 110, rect), 10);
  assert.equal(distanceToRect(160, 130, rect), Math.hypot(10, 10));
});

test('タップ位置に最も近い注目箇所を選び、遠すぎる場合は選ばない', () => {
  const focuses = [
    { id: 'a', rects: [rect] },
    { id: 'b', rects: [{ x: 300, y: 100, w: 50, h: 20 }] },
  ];
  assert.equal(hitTestFocus(focuses, 120, 110), 'a');
  assert.equal(hitTestFocus(focuses, 290, 110), 'b', '矩形の少し外でも近いほうを選ぶ');
  assert.equal(hitTestFocus(focuses, 225, 400), null);
});

test('文字の配置から行ごとの矩形を作る', () => {
  const chars = [
    { offset: 0, x: 0, y: 0, w: 10 },
    { offset: 1, x: 10, y: 0, w: 10 },
    { offset: 2, x: 0, y: 50, w: 10 },
    { offset: 3, x: 10, y: 50, w: 10 },
  ];
  assert.deepEqual(rectsForSpan(chars, [1, 3], 50, 8), [
    { x: 10, y: 8, w: 10, h: 34 },
    { x: 0, y: 58, w: 10, h: 34 },
  ]);
  assert.deepEqual(rectsForSpan(chars, null, 50), []);
});
