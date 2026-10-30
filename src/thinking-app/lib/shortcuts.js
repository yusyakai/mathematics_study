// PC のキー操作（純粋な関数）
//   1〜9  … その番号の注目箇所を選ぶ
//   → / N … 次へ（答えを見る・次の気づき・次の注目箇所・振り返り）
// 入力欄で文字を打っているときや、Ctrl などと組み合わせたときは反応しない
export function shortcutAction(event, focusCount) {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  const target = event.target;
  if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return null;
  if (/^[1-9]$/.test(event.key) && Number(event.key) <= focusCount) return { type: 'select', index: Number(event.key) - 1 };
  if (event.key === 'ArrowRight' || event.key === 'n' || event.key === 'N') return { type: 'next' };
  return null;
}
