// 注目箇所どうしのつながり（links）の扱い（React に依存しない純粋な関数）
//
// つながり = { term, source }
//   term   … 中身があとでわかる語句（例: ①の気づき「（あてはまる場合の数）÷（全体の場合の数）で求める」の「あてはまる場合の数」）
//   source … その中身がわかるところ（例: ④の気づき「あてはまる場合の数は、赤玉3個から2個を選ぶ ₃C₂ 通り」の「₃C₂」）
// データでは端を { focus, insight?, text? } で書く（insight を省くと引用、text を省くと全体）。
// 画面では normalizeProblem() が resolvedLinks に { focusIndex, insightIndex（-1 は引用）, text, span } の形に直したものを使う。
// 板書では、両方の端が出たときに線で結び、語句の側に「どこで何とわかったか」を書き添える。
import { focusColor } from './colors.js';

// ---------- 学習画面（板書） ----------

// 端が板書に出ているか。引用は注目箇所を開いたとき、気づきは答えを出したときに出る
//   progress: { [focusId]: { opened, revealed } }
export function endShown(problem, progress, end) {
  const entry = progress[problem.focuses[end.focusIndex]?.id];
  if (!entry) return false;
  return end.insightIndex === -1 ? entry.opened > 0 : entry.revealed > end.insightIndex;
}

// つながりごとの状態。色は source の注目箇所の色（「どこでわかったか」を色で示す）
export function linkStates(problem, progress) {
  return (problem.resolvedLinks ?? []).map((link, index) => {
    const termShown = endShown(problem, progress, link.term);
    const sourceShown = endShown(problem, progress, link.source);
    return { index, term: link.term, source: link.source, termShown, sourceShown, complete: termShown && sourceShown, color: focusColor(link.source.focusIndex) };
  });
}

// 板書の1つの文（気づきの thought、insightIndex が -1 なら注目箇所の引用）に付ける印
//   戻り値: [{ span, ends: [{ key, index, role, complete, color, other }] }]
//   span が null の印は文全体を指す。同じ範囲を指す端は1つの印にまとめる
//   語句の側は、自分が出た時点で「あとでわかる」印を付ける。わかる側は、つながりが見えてから印を付ける
export function marksFor(states, focusIndex, insightIndex) {
  const marks = [];
  for (const st of states) {
    for (const role of ['term', 'source']) {
      const end = st[role];
      if (end.focusIndex !== focusIndex || end.insightIndex !== insightIndex) continue;
      if (role === 'term' ? !st.termShown : !st.complete) continue;
      const item = { key: `${st.index}-${role}`, index: st.index, role, complete: st.complete, color: st.color, other: role === 'term' ? st.source : st.term };
      const same = marks.find(m => (m.span === null ? end.span === null : end.span !== null && m.span[0] === end.span[0] && m.span[1] === end.span[1]));
      if (same) same.ends.push(item);
      else marks.push({ span: end.span, ends: [item] });
    }
  }
  return marks;
}

// 文を印の範囲で区切る。戻り値: [{ text, mark? }]（範囲が重なる印は検証で除いている）
export function splitByMarks(text, marks) {
  const ranged = marks.filter(m => m.span).sort((a, b) => a.span[0] - b.span[0]);
  const segments = [];
  let pos = 0;
  for (const mark of ranged) {
    if (mark.span[0] < pos) continue;
    if (mark.span[0] > pos) segments.push({ text: text.slice(pos, mark.span[0]) });
    segments.push({ text: text.slice(mark.span[0], mark.span[1]), mark });
    pos = mark.span[1];
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) });
  return segments;
}

// 端の短い呼び名（語句があれば語句、なければ気づき・引用の書き出し）
export function endLabel(problem, end, max = 18) {
  if (end.text) return end.text;
  const focus = problem.focuses[end.focusIndex];
  const full = end.insightIndex === -1 ? focus.quote : focus.insights[end.insightIndex].thought;
  const chars = [...full];
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : full;
}

// 線を引く縦の位置（レーン）。上下に短いつながりほど内側にし、線どうしが交わりにくくする
//   items: [{ index, fromY, toY }] → { [index]: レーン番号（0 が内側） }
export function assignLanes(items) {
  const sorted = [...items].sort((a, b) => Math.abs(a.toY - a.fromY) - Math.abs(b.toY - b.fromY) || a.index - b.index);
  return Object.fromEntries(sorted.map((item, lane) => [item.index, lane]));
}

// 線の経路（SVG の path）。文字の上は通らず、板書の右の余白で縦に結ぶ
//   fromY: わかる側の行の高さ、toY: 語句の側の行の高さ、edgeX: 文の右端、laneX: 縦の線の位置
//   戻り値: { d: 線, head: 語句の側の矢じり, dot: わかる側の点 }
export function connectorPath(fromY, toY, edgeX, laneX) {
  const r = (v) => Math.round(v * 10) / 10;
  const dir = toY >= fromY ? 1 : -1;
  const radius = Math.min(6, Math.abs(toY - fromY) / 2, (laneX - edgeX) / 2);
  const tip = edgeX + 2;
  const d = radius < 1
    ? `M ${r(edgeX + 3)} ${r(fromY)} H ${r(laneX)} V ${r(toY)} H ${r(tip + 6)}`
    : [
        `M ${r(edgeX + 3)} ${r(fromY)}`,
        `H ${r(laneX - radius)}`,
        `Q ${r(laneX)} ${r(fromY)} ${r(laneX)} ${r(fromY + dir * radius)}`,
        `V ${r(toY - dir * radius)}`,
        `Q ${r(laneX)} ${r(toY)} ${r(laneX - radius)} ${r(toY)}`,
        `H ${r(tip + 6)}`,
      ].join(' ');
  return {
    d,
    head: `M ${r(tip)} ${r(toY)} L ${r(tip + 7)} ${r(toY - 4.5)} L ${r(tip + 7)} ${r(toY + 4.5)} Z`,
    dot: { x: r(edgeX + 3), y: r(fromY) },
  };
}

// ---------- 作成ツール ----------
// 作成ツールの下書きでは、端の insight を「その注目箇所の中で何番目の気づきか（1始まり）」で持つ（null は引用）。
// 気づきを並べ替え・削除したら、つながりが同じ気づきを指し続けるように番号を合わせる。

const mapEnds = (links, fn) => links.map(l => ({ term: fn(l.term), source: fn(l.source) }));

// 注目箇所 focusId の a 番目と b 番目の気づきを入れ替えたとき
export function swapInsightRefs(links, focusId, a, b) {
  return mapEnds(links, e => {
    if (e.focus !== focusId || e.insight === null) return e;
    if (e.insight === a) return { ...e, insight: b };
    if (e.insight === b) return { ...e, insight: a };
    return e;
  });
}

// 注目箇所 focusId の n 番目の気づきを削除したとき（その気づきを指すつながりは消す）
export function removeInsightRefs(links, focusId, n) {
  return mapEnds(
    links.filter(l => ![l.term, l.source].some(e => e.focus === focusId && e.insight === n)),
    e => (e.focus === focusId && e.insight !== null && e.insight > n ? { ...e, insight: e.insight - 1 } : e),
  );
}

// 注目箇所を削除したとき（その注目箇所を指すつながりは消す）
export function removeFocusRefs(links, focusId) {
  return links.filter(l => l.term.focus !== focusId && l.source.focus !== focusId);
}

// 気づき（insight が null なら注目箇所）を指しているつながりの数
export function countRefs(links, focusId, n = null) {
  return links.filter(l => [l.term, l.source].some(e => e.focus === focusId && (n === null || e.insight === n))).length;
}

// 語句の入力候補（文を記号・区切りで分けた部分。式の中の語句や ₃C₂ などを選びやすくする）
export function phraseCandidates(text) {
  if (!text) return [];
  const parts = text.split(/[\s、。，．,（）()「」『』→⇒÷×＝=:：]+/).map(p => p.trim()).filter(p => p && p !== text);
  return [...new Set(parts)];
}

// 文全体を指す端のキー（気づき・引用の要素に data-link-end として付け、線の端にする）。なければ undefined
export function wholeKeys(marks) {
  const keys = (marks ?? []).filter(m => m.span === null).flatMap(m => m.ends.map(e => e.key));
  return keys.length ? keys.join(' ') : undefined;
}
