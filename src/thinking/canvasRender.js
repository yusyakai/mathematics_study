// AR用の画像を canvas に描く
//   renderCard      : 印刷・画面表示する問題カード（AR の認識対象）と、注目箇所の位置
//   renderHighlight : カードに重ねる注目箇所のハイライト
//   renderPanel     : カードの上に浮かべる思考ノード
// 端末ごとのフォント差でカードの見た目と注目箇所の位置がずれないよう、Webフォントで描く
import { STAGES } from './schema';
import { TRIGGER_COLORS } from './loadThinking';

export const CARD_W = 1200;
export const CARD_H = 800;
const BORDER = 72;
const FONT = '"Noto Sans JP", sans-serif';

export async function ensureFonts(problem) {
  if (!document.fonts) return;
  const text = [
    problem.title, problem.subject, problem.unit, problem.problem,
    ...problem.thoughts.flatMap(n => [n.text, n.reason || '']),
    '気づき方針実行採用不採用解法セレクト✓✕',
  ].join('');
  try {
    await Promise.race([
      Promise.all(['400', '700'].map(w => document.fonts.load(`${w} 32px "Noto Sans JP"`, text))),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]);
  } catch {
    // フォントが読めなくても端末のフォントで続行する
  }
}

// 問題IDから決まる乱数（カード模様を毎回同じにする）
function seededRandom(str) {
  let h = 1779033703;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// 枠の幾何学模様。文字だけのカードは特徴点が少なく AR の追従が不安定になるため
function drawPattern(ctx, id) {
  const rand = seededRandom(id);
  const colors = ['#1e293b', '#4f46e5', '#0f766e', '#b45309', '#be123c'];
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  for (let i = 0; i < 260; i++) {
    const edge = Math.floor(rand() * 4);
    const along = rand();
    const across = rand() * BORDER;
    const x = edge < 2 ? along * CARD_W : (edge === 2 ? across : CARD_W - across);
    const y = edge < 2 ? (edge === 0 ? across : CARD_H - across) : along * CARD_H;
    const s = 8 + rand() * 22;
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    const shape = Math.floor(rand() * 3);
    ctx.beginPath();
    if (shape === 0) ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    else if (shape === 1) ctx.rect(-s / 2, -s / 2, s, s * 0.6);
    else { ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); }
    ctx.fill();
    ctx.restore();
  }
}

// 1文字ずつ折り返し、各文字の位置を返す
function layoutChars(ctx, text, maxWidth, lineHeight) {
  const NO_LINE_START = '、。，．）)」';
  const chars = [];
  let x = 0;
  let line = 0;
  let offset = 0; // UTF-16 上の位置（locateQuote の位置と合わせる）
  for (const ch of text) {
    const w = ctx.measureText(ch).width;
    if (x + w > maxWidth && x > 0 && !NO_LINE_START.includes(ch)) {
      x = 0;
      line++;
    }
    chars.push({ ch, offset, x, y: line * lineHeight, w });
    x += w;
    offset += ch.length;
  }
  return { chars, lines: line + 1 };
}

export function renderCard(problem) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  drawPattern(ctx, problem.id);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(BORDER, BORDER, CARD_W - BORDER * 2, CARD_H - BORDER * 2);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(BORDER, BORDER, CARD_W - BORDER * 2, CARD_H - BORDER * 2);

  const left = BORDER + 48;
  const maxWidth = CARD_W - left * 2;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#64748b';
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText([problem.subject, problem.unit, problem.title].filter(Boolean).join('｜'), left, BORDER + 32);
  ctx.font = `400 20px ${FONT}`;
  ctx.fillText(`解法セレクト AR  #${problem.id}`, left, CARD_H - BORDER - 44);

  const fontSize = 46;
  const lineHeight = Math.round(fontSize * 1.8);
  ctx.font = `700 ${fontSize}px ${FONT}`;
  const { chars, lines } = layoutChars(ctx, problem.problem, maxWidth, lineHeight);
  const areaTop = BORDER + 90;
  const areaBottom = CARD_H - BORDER - 60;
  const top = areaTop + Math.max(0, (areaBottom - areaTop - lines * lineHeight) / 2);
  ctx.fillStyle = '#0f172a';
  for (const c of chars) ctx.fillText(c.ch, left + c.x, top + c.y + (lineHeight - fontSize) / 2);

  // 注目箇所の矩形（行ごと）
  const triggers = problem.triggers.map(t => {
    const rects = [];
    for (const c of chars) {
      if (c.offset < t.span[0] || c.offset >= t.span[1]) continue;
      const last = rects[rects.length - 1];
      const y = top + c.y + 4;
      if (last && last.y === y) last.w = left + c.x + c.w - last.x;
      else rects.push({ x: left + c.x, y, w: c.w, h: lineHeight - 8 });
    }
    return { id: t.id, rects };
  });

  return { canvas, triggers };
}

export function renderHighlight(canvas, cardTriggers, visible) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!visible.triggers) return;
  cardTriggers.forEach((t, i) => {
    const color = TRIGGER_COLORS[i % TRIGGER_COLORS.length];
    t.rects.forEach(r => {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = color;
      ctx.fillRect(r.x - 4, r.y, r.w + 8, r.h);
      ctx.globalAlpha = 1;
      ctx.fillRect(r.x - 4, r.y + r.h - 6, r.w + 8, 6);
    });
    const first = t.rects[0];
    if (!first) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(first.x - 4, first.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), first.x - 4, first.y + 1);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  });
}

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

// 思考ノードの配置を計算する（表示段階に関係なく固定。段階が進んでも位置が動かない）
export function layoutPanel(problem) {
  const PANEL_W = CARD_W;
  const pad = 24;
  const colGap = 20;
  const stageKeys = Object.keys(STAGES);
  const colW = (PANEL_W - pad * 2 - colGap * (stageKeys.length - 1)) / stageKeys.length;
  const ctx = document.createElement('canvas').getContext('2d');
  const colY = Object.fromEntries(stageKeys.map(k => [k, pad + 56]));
  const nodes = {};

  for (const n of problem.thoughts) {
    const col = stageKeys.indexOf(n.stage);
    ctx.font = `700 26px ${FONT}`;
    const lines = wrapLines(ctx, n.text, colW - 32);
    ctx.font = `400 21px ${FONT}`;
    const subLines = n.stage === 'strategy'
      ? wrapLines(ctx, n.adopted ? '✓ 採用' : `✕ 不採用: ${n.reason}`, colW - 32)
      : [];
    const h = 24 + lines.length * 36 + subLines.length * 30 + 12;
    nodes[n.id] = { x: pad + col * (colW + colGap), y: colY[n.stage], w: colW, h, col, lines, subLines, node: n };
    colY[n.stage] += h + 16;
  }
  const height = Math.max(360, Math.max(...Object.values(colY)) + pad);
  return { width: PANEL_W, height, nodes, colW, pad, colGap, stageKeys };
}

export function renderPanel(canvas, problem, layout, visible) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (visible.thoughtIds.size === 0) return;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.beginPath();
  ctx.roundRect(0, 0, layout.width, layout.height, 28);
  ctx.fill();

  ctx.textBaseline = 'top';
  layout.stageKeys.forEach((k, i) => {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(STAGES[k].label, layout.pad + i * (layout.colW + layout.colGap) + 8, layout.pad + 8);
  });

  // ノード同士のつながり
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 4;
  for (const n of problem.thoughts) {
    if (!visible.thoughtIds.has(n.id)) continue;
    const to = layout.nodes[n.id];
    for (const ref of n.from) {
      const from = layout.nodes[ref];
      if (!from || !visible.thoughtIds.has(ref)) continue;
      ctx.beginPath();
      if (from.col < to.col) {
        const x1 = from.x + from.w, y1 = from.y + from.h / 2, x2 = to.x, y2 = to.y + to.h / 2;
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 + 30, y1, x2 - 30, y2, x2, y2);
      } else {
        ctx.moveTo(from.x + from.w / 2, from.y + from.h);
        ctx.lineTo(to.x + to.w / 2, to.y);
      }
      ctx.stroke();
    }
  }

  for (const n of problem.thoughts) {
    if (!visible.thoughtIds.has(n.id)) continue;
    const box = layout.nodes[n.id];
    const rejected = n.adopted === false;
    ctx.fillStyle = rejected ? '#334155' : '#1e293b';
    ctx.strokeStyle = rejected ? '#64748b' : (n.adopted ? '#34d399' : '#818cf8');
    ctx.lineWidth = 4;
    ctx.setLineDash(rejected ? [10, 8] : []);
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = rejected ? '#94a3b8' : '#f8fafc';
    ctx.font = `700 26px ${FONT}`;
    box.lines.forEach((l, i) => ctx.fillText(l, box.x + 16, box.y + 18 + i * 36));
    ctx.fillStyle = rejected ? '#fca5a5' : '#6ee7b7';
    ctx.font = `400 21px ${FONT}`;
    box.subLines.forEach((l, i) => ctx.fillText(l, box.x + 16, box.y + 18 + box.lines.length * 36 + i * 30));
  }
}
