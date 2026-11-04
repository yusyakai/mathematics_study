import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { focusColor } from '../lib/colors.js';
import { linkStates, marksFor, assignLanes, connectorPath } from '../lib/links.js';
import { FocusHead, InsightCard } from './InsightCard.jsx';
import Icon from './Icon.jsx';

const LANE_GAP = 8; // 線どうしの間隔（px）

// 板書: 開いた注目箇所の気づきを番号の順に書き並べ、注目箇所どうしのつながりを線で結ぶ。
// 線は文字の上を通らないよう、板書の右の余白で縦に結ぶ（lib/links.js の connectorPath）。
//   progress: { [focusId]: { opened, revealed } }（出した気づきの数。問いかけ中の気づきは「考えてみよう」で出す）
//   activeId: いま開いている注目箇所（強調する）
//   animate : 新しく見えたつながりの線を描く動きを付けるか（振り返りでは付けない）
export default function Board({ problem, progress, activeId = null, animate = true }) {
  const boardRef = useRef(null);
  const svgRef = useRef(null);
  const seenRef = useRef(new Set()); // すでに描いた線（新しく見えた線だけ描く動きを付ける）
  const [flash, setFlash] = useState(null); // 移動ボタンで強調しているつながり
  const states = linkStates(problem, progress);
  const visible = states.filter(s => s.complete);
  // つながりがある問題は、線を引く余白をはじめから空けておく（線が出ても文が動かないように）
  const linkCount = problem.resolvedLinks?.length ?? 0;
  const gutter = linkCount ? 14 + linkCount * LANE_GAP : 0;

  // 描画のたびに線の位置を合わせる（気づきが増えると文の位置が変わるため）
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const lines = [...svg.querySelectorAll('[data-line]')];
    const present = new Set(lines.map(g => g.dataset.line));
    for (const g of lines) {
      if (seenRef.current.has(g.dataset.line)) continue;
      seenRef.current.add(g.dataset.line);
      if (animate) g.classList.add('new');
    }
    // 最初からやり直して見えなくなった線は、また見えたときに描き直す
    seenRef.current = new Set([...seenRef.current].filter(key => present.has(key)));
    layoutLines(boardRef.current, svg);
  });

  // 幅が変わったとき（画面の回転・フォントの読み込みなど）も合わせる
  useEffect(() => {
    const board = boardRef.current;
    const relayout = () => layoutLines(board, svgRef.current);
    const observer = new ResizeObserver(relayout);
    observer.observe(board);
    document.fonts?.ready.then(relayout);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (flash === null) return undefined;
    const timer = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(timer);
  }, [flash]);

  // 書き添えを押したら、つながりの反対の端へ移動して強調する
  const jump = (index, role) => {
    const target = boardRef.current?.querySelector(`[data-link-end~="${index}-${role}"]`);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    setFlash(index);
  };
  const linksFor = (focusIndex, insightIndex) => ({ marks: marksFor(states, focusIndex, insightIndex), problem, onJump: jump, flash });

  return (
    <div className="board" ref={boardRef} style={{ '--board-gutter': `${gutter}px` }}>
      <h3 className="board-title"><Icon name="board" size={16} />板書</h3>
      <ol className="board-sections">
        {problem.focuses.map((f, i) => {
          const entry = progress[f.id];
          if (!entry || entry.opened === 0) return null;
          const pending = entry.opened > entry.revealed;
          return (
            <li key={f.id} className={`board-section ${f.id === activeId ? 'active' : ''}`} style={{ '--focus': focusColor(i) }}>
              <FocusHead focus={f} index={i} links={linksFor(i, -1)} />
              <ol className="insight-list">
                {f.insights.slice(0, entry.revealed).map((s, j) => (
                  <InsightCard key={s.priority} insight={s} order={j + 1} links={linksFor(i, j)} />
                ))}
                {pending && <InsightCard insight={f.insights[entry.revealed]} prompt />}
              </ol>
            </li>
          );
        })}
      </ol>
      <svg className="board-lines" ref={svgRef} aria-hidden="true">
        {visible.map(s => (
          <g key={s.index} data-line={s.index} className={`board-line ${flash === s.index ? 'flash' : ''}`} style={{ '--link': s.color }}>
            <path className="board-line-path" pathLength="1" />
            <path className="board-line-head" />
            <circle r="3.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// 線の位置を、いまの文の位置に合わせる（DOM から読み、SVG に直接書く）
function layoutLines(board, svg) {
  if (!board || !svg) return;
  const base = board.getBoundingClientRect();
  const edgeX = board.clientWidth - (parseFloat(getComputedStyle(board).paddingRight) || 0);
  const items = [...svg.querySelectorAll('[data-line]')].map(g => {
    const index = Number(g.dataset.line);
    const source = board.querySelector(`[data-link-end~="${index}-source"]`);
    const term = board.querySelector(`[data-link-end~="${index}-term"]`);
    return source && term ? { g, index, fromY: middleY(source, base), toY: middleY(term, base) } : null;
  }).filter(Boolean);
  const lanes = assignLanes(items);
  for (const item of items) {
    const { d, head, dot } = connectorPath(item.fromY, item.toY, edgeX, edgeX + 8 + lanes[item.index] * LANE_GAP);
    const [line, arrow] = item.g.querySelectorAll('path');
    line.setAttribute('d', d);
    arrow.setAttribute('d', head);
    const circle = item.g.querySelector('circle');
    circle.setAttribute('cx', dot.x);
    circle.setAttribute('cy', dot.y);
  }
}

// 要素の（折り返していれば最後の行の）縦の中央。板書の中での位置
function middleY(el, base) {
  const rects = el.getClientRects();
  const r = rects.length ? rects[rects.length - 1] : el.getBoundingClientRect();
  return r.top + r.height / 2 - base.top;
}
