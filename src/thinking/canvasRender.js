// AR用の画像を canvas に描く
//   renderCard      : 印刷・画面表示する問題カード（AR の認識対象）と、注目箇所の位置
//   renderHighlight : カードに重ねる注目箇所の番号とハイライト
//   renderBubble    : 触った注目箇所の上に浮かべる気づきの吹き出し
// 端末ごとのフォント差でカードの見た目と注目箇所の位置がずれないよう、Webフォントで描く
import { INSIGHT_KINDS } from './schema';
import { focusColor } from './loadThinking';

export const CARD_W = 1200;
export const CARD_H = 800;
export const BUBBLE_W = 1000;
const BORDER = 72;
const FONT = '"Noto Sans JP", sans-serif';

export async function ensureFonts(problem) {
  if (!document.fonts) return;
  const text = [
    problem.title, problem.subject, problem.unit, problem.problem,
    ...problem.focuses.flatMap(f => [f.quote, ...f.insights.flatMap(s => [s.cue, s.thought])]),
    ...Object.values(INSIGHT_KINDS).flatMap(k => [k.label, k.phrase]),
    '解法セレクト「」→',
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
  const lineHeight = Math.round(fontSize * 1.9);
  ctx.font = `700 ${fontSize}px ${FONT}`;
  const { chars, lines } = layoutChars(ctx, problem.problem, maxWidth, lineHeight);
  const areaTop = BORDER + 90;
  const areaBottom = CARD_H - BORDER - 60;
  const top = areaTop + Math.max(0, (areaBottom - areaTop - lines * lineHeight) / 2);
  ctx.fillStyle = '#0f172a';
  for (const c of chars) ctx.fillText(c.ch, left + c.x, top + c.y + (lineHeight - fontSize) / 2);

  // 注目箇所の矩形（行ごと）
  const focuses = problem.focuses.map(f => {
    const rects = [];
    for (const c of chars) {
      if (c.offset < f.span[0] || c.offset >= f.span[1]) continue;
      const last = rects[rects.length - 1];
      const y = top + c.y + 8;
      if (last && last.y === y) last.w = left + c.x + c.w - last.x;
      else rects.push({ x: left + c.x, y, w: c.w, h: lineHeight - 16 });
    }
    return { id: f.id, rects };
  });

  return { canvas, focuses };
}

// カード上の座標 (px) にある注目箇所のIDを返す
export function hitTestFocus(cardFocuses, x, y, pad = 16) {
  const hit = cardFocuses.find(f => f.rects.some(r =>
    x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad));
  return hit?.id ?? null;
}

// state: { shown, opened:Set, activeId, nextId }
export function renderHighlight(canvas, cardFocuses, state) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.shown) return;

  cardFocuses.forEach((f, i) => {
    const color = focusColor(i);
    const isActive = f.id === state.activeId;
    const isOpened = state.opened.has(f.id);
    const isNext = f.id === state.nextId;
    f.rects.forEach(r => {
      ctx.globalAlpha = isActive ? 0.4 : (isNext ? 0.22 : 0.12);
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

    // 見る順番の番号
    const first = f.rects[0];
    if (!first) return;
    const radius = isNext ? 24 : 20;
    ctx.fillStyle = isOpened && !isActive ? '#94a3b8' : color;
    ctx.beginPath();
    ctx.arc(first.x - 4, first.y - 4, radius, 0, Math.PI * 2);
    ctx.fill();
    if (isNext) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = `700 24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), first.x - 4, first.y - 3);
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

// 1つの注目箇所の気づきを吹き出しとして描く。高さは内容に合わせる
export function renderBubble(problem, index) {
  const focus = problem.focuses[index];
  const color = focusColor(index);
  const pad = 28;
  const textW = BUBBLE_W - pad * 2;
  const measure = document.createElement('canvas').getContext('2d');

  const rows = focus.insights.map(s => {
    measure.font = `400 26px ${FONT}`;
    const cueLines = wrapLines(measure, `「${s.cue}」${INSIGHT_KINDS[s.kind].phrase}`, textW - 150);
    measure.font = `700 32px ${FONT}`;
    const thoughtLines = wrapLines(measure, `→ ${s.thought}`, textW);
    return { s, cueLines, thoughtLines, h: cueLines.length * 36 + thoughtLines.length * 44 + 28 };
  });
  const headerH = 64;
  const height = pad + headerH + rows.reduce((sum, r) => sum + r.h, 0) + pad;

  const canvas = document.createElement('canvas');
  canvas.width = BUBBLE_W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(3, 3, BUBBLE_W - 6, height - 6, 28);
  ctx.fill();
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pad + 22, pad + 22, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(index + 1), pad + 22, pad + 8);
  ctx.textAlign = 'left';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`「${focus.quote}」`, pad + 56, pad + 4);

  let y = pad + headerH;
  for (const r of rows) {
    const written = r.s.kind === 'written';
    ctx.fillStyle = written ? '#2563eb' : '#d97706';
    ctx.beginPath();
    ctx.roundRect(pad, y, 136, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `700 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(INSIGHT_KINDS[r.s.kind].label, pad + 68, y + 6);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `400 26px ${FONT}`;
    r.cueLines.forEach((l, i) => ctx.fillText(l, pad + 150, y + 2 + i * 36));
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 32px ${FONT}`;
    const ty = y + r.cueLines.length * 36 + 6;
    r.thoughtLines.forEach((l, i) => ctx.fillText(l, pad, ty + i * 44));
    y += r.h;
  }

  return canvas;
}
