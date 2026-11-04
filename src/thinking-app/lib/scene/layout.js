// 立体表示の配置の計算（three.js に依存しない純粋な関数）
// 座標の単位はカードの幅（= 1）。カードの中心が原点、上が +y、手前が +z。
//
// 吹き出しの置き方は2通り:
//   above … カードの上（縦長の画面・カメラのAR）
//   side  … カードの右（横長の画面）

export const SCENE = {
  gap: 0.05, // カードと吹き出しの間
  bubbleZ: 0.1, // 吹き出しをカードより手前に浮かせる距離
  bubbleWidth: { above: 0.9, side: 0.8 },
};

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// 幅 w・高さ h の吹き出しの中心
export function bubbleCenter(layout, cardH, w, h) {
  if (layout === 'side') {
    return { x: 0.5 + SCENE.gap + w / 2, y: cardH / 2 - h / 2, z: SCENE.bubbleZ };
  }
  return { x: 0, y: cardH / 2 + SCENE.gap + h / 2, z: SCENE.bubbleZ };
}

// 注目箇所から吹き出しへの線の経路（カード上の点の列、px）。
// 文字の上を横切らないよう、注目箇所の下の行間を通って右の余白へ出て、
// above のときは余白に沿ってカードの上端まで上がる。最後の点から吹き出しの縁へつなぐ。
//   rects : 注目箇所の行ごとの矩形
//   margin: { x: 右の余白の x, top: 白い部分の上端の y }
export function connectorPathPx(layout, rects, margin) {
  const last = rects[rects.length - 1];
  const start = { x: last.x + last.w / 2, y: last.y + last.h };
  const gapY = last.y + last.h + 6;
  const path = [start, { x: start.x, y: gapY }, { x: margin.x, y: gapY }];
  if (layout === 'above') path.push({ x: margin.x, y: margin.top });
  return path;
}

// 線の終点（吹き出しの縁）。from は経路の最後の点（シーンの座標）
export function lineEnd(layout, center, w, h, from) {
  if (layout === 'side') {
    return { x: center.x - w / 2, y: clamp(from.y, center.y - h / 2 + 0.03, center.y + h / 2 - 0.03), z: center.z };
  }
  return { x: clamp(from.x, center.x - w / 2 + 0.03, center.x + w / 2 - 0.03), y: center.y - h / 2, z: center.z };
}

// カードと吹き出し（最も高くなるとき）をすべて含む範囲
export function contentBox(layout, cardH, w, maxH) {
  if (layout === 'side') {
    return { minX: -0.5, maxX: 0.5 + SCENE.gap + w, minY: Math.min(-cardH / 2, cardH / 2 - maxH), maxY: cardH / 2 };
  }
  const half = Math.max(0.5, w / 2);
  return { minX: -half, maxX: half, minY: -cardH / 2, maxY: cardH / 2 + SCENE.gap + maxH };
}

export const boxCenter = (box) => ({ x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 });

// 範囲全体が画面に収まるカメラの距離（fovDeg は縦方向の視野角、aspect は画面の幅 ÷ 高さ）
export function fitDistance(box, fovDeg, aspect, margin = 1.1) {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  return Math.max(h / 2 / t, w / 2 / (t * aspect)) * margin;
}

// 画面の縦横比に合わせて、内容が大きく見えるほうの配置を選ぶ
//   sizes: { above: { w, maxH }, side: { w, maxH } }（吹き出しの幅と最大の高さ）
export function chooseLayout(aspect, cardH, sizes, fovDeg) {
  const distance = (layout) => fitDistance(contentBox(layout, cardH, sizes[layout].w, sizes[layout].maxH), fovDeg, aspect);
  return distance('side') < distance('above') ? 'side' : 'above';
}
