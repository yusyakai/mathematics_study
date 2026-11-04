import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENE, bubbleCenter, connectorPathPx, lineEnd, contentBox, boxCenter, fitDistance, chooseLayout } from '../scene/layout.js';

const cardH = 800 / 1200;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test('吹き出しはカードの上（above）か右（side）に、すき間をあけて手前に浮かせる', () => {
  const above = bubbleCenter('above', cardH, 0.9, 0.4);
  close(above.y - 0.2, cardH / 2 + SCENE.gap);
  assert.equal(above.x, 0);
  const side = bubbleCenter('side', cardH, 0.8, 0.4);
  close(side.x - 0.4, 0.5 + SCENE.gap);
  close(side.y + 0.2, cardH / 2);
  assert.equal(above.z, SCENE.bubbleZ);
});

test('線の経路は注目箇所の下の行間を通って右の余白へ出る（文字の上を横切らない）', () => {
  const rects = [{ x: 100, y: 200, w: 300, h: 70 }, { x: 120, y: 287, w: 80, h: 70 }];
  const margin = { x: 1104, top: 72 };
  const side = connectorPathPx('side', rects, margin);
  // 最後の行の下線の中央から始まり、行の下（矩形の下端より下）を右の余白まで進む
  assert.deepEqual(side[0], { x: 160, y: 357 });
  assert.ok(side[1].y > 357 && side[2].y === side[1].y);
  assert.equal(side[2].x, margin.x);
  // above は右の余白に沿ってカードの上端まで上がる
  const above = connectorPathPx('above', rects, margin);
  assert.deepEqual(above.at(-1), { x: margin.x, y: margin.top });
  assert.equal(above.length, side.length + 1);
});

test('線の終点は吹き出しの縁の中に収める', () => {
  const center = { x: 0, y: 0.6, z: 0.1 };
  const top = lineEnd('above', center, 0.9, 0.4, { x: 0.42, y: 0.3 });
  close(top.x, 0.42);
  close(top.y, 0.4); // 吹き出しの下端
  assert.equal(top.z, 0.1);
  close(lineEnd('above', center, 0.9, 0.4, { x: 2, y: 0 }).x, 0.45 - 0.03); // 吹き出しの幅を超えない
  const sideCenter = { x: 0.95, y: 0.1, z: 0.1 };
  const side = lineEnd('side', sideCenter, 0.8, 0.4, { x: 0.42, y: -1 });
  close(side.x, 0.55); // 吹き出しの左端
  close(side.y, 0.1 - 0.2 + 0.03); // 吹き出しの高さの中に収める
});

test('表示範囲はカードと最も高い吹き出しを含む', () => {
  const above = contentBox('above', cardH, 0.9, 0.5);
  assert.deepEqual([above.minX, above.maxX], [-0.5, 0.5]);
  close(above.maxY, cardH / 2 + SCENE.gap + 0.5);
  const side = contentBox('side', cardH, 0.8, 1);
  close(side.maxX, 0.5 + SCENE.gap + 0.8);
  close(side.minY, cardH / 2 - 1, '吹き出しがカードより高ければ下にはみ出す分も含む');
  assert.deepEqual(boxCenter({ minX: -1, maxX: 3, minY: 0, maxY: 2 }), { x: 1, y: 1 });
});

test('カメラの距離は、縦横の狭いほうに合わせて全体が収まる', () => {
  const box = { minX: -1, maxX: 1, minY: -0.5, maxY: 0.5 };
  const t = Math.tan((40 * Math.PI) / 360);
  close(fitDistance(box, 40, 2, 1), 0.5 / t); // 幅2・高さ1の範囲を 2:1 の画面に → ぴったり
  close(fitDistance(box, 40, 1, 1), 1 / t); // 正方形の画面では幅で決まる
  assert.ok(fitDistance(box, 40, 2) > fitDistance(box, 40, 2, 1), '余白をとる');
});

test('横長の画面では右、縦長の画面では上に吹き出しを置く', () => {
  const sizes = { above: { w: 0.9, maxH: 0.5 }, side: { w: 0.8, maxH: 0.6 } };
  assert.equal(chooseLayout(2.4, cardH, sizes, 35), 'side');
  assert.equal(chooseLayout(0.6, cardH, sizes, 35), 'above');
});
