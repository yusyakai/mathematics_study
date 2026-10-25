// カード上の位置の計算（純粋な関数）

// 点 (x, y) と矩形の距離（矩形の内側なら 0）
export function distanceToRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

// タップした位置に最も近い注目箇所のIDを返す。maxDistance より遠ければ null。
// スマホではカードが小さく映るため、矩形の少し外側をタップしても選べるようにする
export function hitTestFocus(cardFocuses, x, y, maxDistance = 48) {
  let bestId = null;
  let bestDistance = Infinity;
  for (const f of cardFocuses) {
    for (const r of f.rects) {
      const d = distanceToRect(x, y, r);
      if (d < bestDistance) {
        bestDistance = d;
        bestId = f.id;
      }
    }
  }
  return bestDistance <= maxDistance ? bestId : null;
}

// 文字ごとの配置から、範囲 [start, end) を行ごとの矩形にまとめる
//   chars: { offset, x, y, w } の配列（x, y はカード上の座標）
export function rectsForSpan(chars, span, lineHeight, inset = 8) {
  if (!span) return [];
  const rects = [];
  for (const c of chars) {
    if (c.offset < span[0] || c.offset >= span[1]) continue;
    const last = rects[rects.length - 1];
    const y = c.y + inset;
    if (last && last.y === y) last.w = c.x + c.w - last.x;
    else rects.push({ x: c.x, y, w: c.w, h: lineHeight - inset * 2 });
  }
  return rects;
}
