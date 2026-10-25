// AR用の画像を canvas に描く
//   renderCard      : 印刷・画面表示する問題カード（AR の認識対象）と、文字の配置
//   renderHighlight : カードに重ねる注目箇所の番号・ハイライトと、手がかりの語句の強調
//   renderBubble    : 開いている注目箇所の上に浮かべる吹き出し（出した気づきと問いかけ）
// 端末ごとのフォント差でカードの見た目と注目箇所の位置がずれないよう、Webフォントで描く
import { KINDS, ROLES, promptFor } from './catalog.js';
import { rectsForSpan } from './geometry.js';
import { focusColor, KIND_COLORS } from './colors.js';

export const CARD_W = 1200;
export const CARD_H = 800;
export const BUBBLE_W = 1000;
const BORDER = 72;
const FONT = '"Noto Sans JP", sans-serif';

export async function ensureFonts(problem) {
  if (!document.fonts) return;
  const text = [
    problem.title, problem.subject, problem.unit, problem.problem,
    ...problem.focuses.flatMap(f => [f.quote, ...f.insights.flatMap(s => [s.cue, s.thought, promptFor(s)])]),
    ...Object.values(KINDS).map(k => k.label),
    ...Object.values(ROLES).map(r => r.label),
    '着眼点トレーナー「」→と書いてあるもう一度タップで答え次の気づきあと個0123456789',
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

// 戻り値: { canvas, focuses: [{ id, rects }], rectsFor(span) }
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
  ctx.fillText(`着眼点トレーナー  #${problem.id}`, left, CARD_H - BORDER - 44);

  const fontSize = 46;
  const lineHeight = Math.round(fontSize * 1.9);
  ctx.font = `700 ${fontSize}px ${FONT}`;
  const layout = layoutChars(ctx, problem.problem, maxWidth, lineHeight);
  const areaTop = BORDER + 90;
  const areaBottom = CARD_H - BORDER - 60;
  const top = areaTop + Math.max(0, (areaBottom - areaTop - layout.lines * lineHeight) / 2);
  ctx.fillStyle = '#0f172a';
  for (const c of layout.chars) ctx.fillText(c.ch, left + c.x, top + c.y + (lineHeight - fontSize) / 2);

  // カード上の座標に直した文字の配置
  const chars = layout.chars.map(c => ({ ...c, x: left + c.x, y: top + c.y }));
  const rectsFor = (span) => rectsForSpan(chars, span, lineHeight);

  return {
    canvas,
    focuses: problem.focuses.map(f => ({ id: f.id, rects: rectsFor(f.span) })),
    rectsFor,
  };
}

function drawNumber(ctx, x, y, radius, color, text, ring) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.font = `700 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// view: { shown, activeId, nextId, openedIds: Set, cueRects: 矩形の配列 }
export function renderHighlight(canvas, card, view) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!view.shown) return;

  card.focuses.forEach((f, i) => {
    const color = focusColor(i);
    const isActive = f.id === view.activeId;
    const isOpened = view.openedIds.has(f.id);
    const isNext = f.id === view.nextId;
    f.rects.forEach(r => {
      ctx.globalAlpha = isActive ? 0.3 : (isNext ? 0.2 : 0.1);
      ctx.fillStyle = color;
      ctx.fillRect(r.x - 4, r.y, r.w + 8, r.h);
      ctx.globalAlpha = 1;
      if (isOpened || isActive) {
        ctx.fillRect(r.x - 4, r.y + r.h - 6, r.w + 8, 6);
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(r.x - 4, r.y + r.h - 3);
        ctx.lineTo(r.x + r.w + 4, r.y + r.h - 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    const first = f.rects[0];
    if (first) drawNumber(ctx, first.x - 4, first.y - 4, isNext ? 24 : 20, isOpened && !isActive ? '#64748b' : color, String(i + 1), isNext);
  });

  // いま見ている気づきの手がかりの語句を枠で囲む
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5;
  for (const r of view.cueRects ?? []) {
    ctx.beginPath();
    ctx.roundRect(r.x - 6, r.y - 2, r.w + 12, r.h + 4, 8);
    ctx.stroke();
  }
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

function drawChip(ctx, x, y, text, color) {
  ctx.font = `700 20px ${FONT}`;
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x + 12, y + 5);
  return w;
}

// 1つの注目箇所の吹き出し。entry = { opened, revealed }。高さは内容に合わせる
export function renderBubble(problem, index, entry) {
  const focus = problem.focuses[index];
  const color = focusColor(index);
  const pad = 28;
  const textW = BUBBLE_W - pad * 2;
  const measure = document.createElement('canvas').getContext('2d');

  const rows = focus.insights.slice(0, entry.opened).map((s, i) => {
    const answered = i < entry.revealed;
    measure.font = `400 26px ${FONT}`;
    const subLines = wrapLines(measure, answered ? `「${s.cue}」と書いてある` : promptFor(s), textW);
    measure.font = `700 32px ${FONT}`;
    const mainLines = answered ? wrapLines(measure, `→ ${s.thought}`, textW) : ['（もう一度タップで答え）'];
    return { s, answered, subLines, mainLines, h: 40 + subLines.length * 36 + mainLines.length * 44 + 20 };
  });
  const headerH = 64;
  const remaining = focus.insights.length - entry.opened;
  const footerH = remaining > 0 && entry.opened === entry.revealed ? 44 : 0;
  const height = pad + headerH + rows.reduce((sum, r) => sum + r.h, 0) + footerH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = BUBBLE_W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(3, 3, BUBBLE_W - 6, height - 6, 28);
  ctx.fill();
  ctx.stroke();

  ctx.textBaseline = 'top';
  drawNumber(ctx, pad + 22, pad + 22, 22, color, String(index + 1), false);
  const roleW = drawChip(ctx, pad + 56, pad + 6, ROLES[focus.role].label, '#475569');
  ctx.fillStyle = '#f8fafc';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`「${focus.quote}」`, pad + 64 + roleW, pad + 4);

  let y = pad + headerH;
  for (const r of rows) {
    drawChip(ctx, pad, y, KINDS[r.s.kind].label, KIND_COLORS[r.s.kind]);
    ctx.fillStyle = r.answered ? '#cbd5e1' : '#fde68a';
    ctx.font = `400 26px ${FONT}`;
    r.subLines.forEach((l, j) => ctx.fillText(l, pad, y + 40 + j * 36));
    ctx.fillStyle = r.answered ? '#f8fafc' : '#94a3b8';
    ctx.font = `700 32px ${FONT}`;
    const ty = y + 40 + r.subLines.length * 36 + 4;
    r.mainLines.forEach((l, j) => ctx.fillText(l, pad, ty + j * 44));
    y += r.h;
  }
  if (footerH) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `400 24px ${FONT}`;
    ctx.fillText(`もう一度タップで次の気づき（あと${remaining}個）`, pad, y + 6);
  }

  return canvas;
}
