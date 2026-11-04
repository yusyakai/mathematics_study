// AR用の画像を canvas に描く
//   renderCard      : 印刷・画面表示する問題カード（AR の認識対象）と、文字の配置
//   renderHighlight : カードに重ねる注目箇所の番号・ハイライトと、手がかりの語句の強調
//   renderBubble    : 開いている注目箇所の上に浮かべる吹き出し（出した気づきと問いかけ）
// 画面の立体表示・カメラのAR表示（・将来のスマートグラス）で同じ画像を使う。
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
    '着眼点トレーナー「」→と書いてあるもう一度タップクリックで答え次の気づきあと個考えてみよう（）0123456789',
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

// 戻り値: { canvas, focuses: [{ id, rects }], rectsFor(span), margin }
//   margin: 線を通す余白（x: 文字の右端と枠の間、top: 白い部分の上端）。線が文字の上を横切らないようにするため
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
    margin: { x: (left + maxWidth + CARD_W - BORDER) / 2, top: BORDER },
  };
}

// 番号の丸。ring: 外側に白い縁（カードの上で目立たせる）、halo: さらに外側に色の輪（次に見る注目箇所）
function drawNumber(ctx, x, y, radius, color, text, { ring = false, halo = false } = {}) {
  if (halo) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (ring) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${Math.round(radius * 1.1)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// view: { shown, activeId, nextId, openedIds: Set, cueRects: 矩形の配列 }
// 文字表示（画面の印）と同じ決まり: 破線 = まだ見ていない、実線 = 見た、塗り = いま見ている
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
      ctx.globalAlpha = isActive ? 0.28 : (isNext ? 0.18 : 0.1);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(r.x - 4, r.y, r.w + 8, r.h, [6, 6, 0, 0]);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (isOpened || isActive) {
        ctx.fillRect(r.x - 4, r.y + r.h - 6, r.w + 8, 6);
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(r.x - 4, r.y + r.h - 3);
        ctx.lineTo(r.x + r.w + 4, r.y + r.h - 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  });

  // いま見ている気づきの手がかりの語句（蛍光ペンの色の縁取り）
  for (const r of view.cueRects ?? []) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(r.x - 6, r.y - 2, r.w + 12, r.h + 4, 8);
    ctx.stroke();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // 番号は最後に描き、ハイライトや枠に隠れないようにする
  card.focuses.forEach((f, i) => {
    const first = f.rects[0];
    if (!first) return;
    const isActive = f.id === view.activeId;
    const isOpened = view.openedIds.has(f.id);
    const isNext = f.id === view.nextId;
    const color = isOpened && !isActive ? '#6e7391' : focusColor(i);
    drawNumber(ctx, first.x - 4, first.y - 4, isNext || isActive ? 22 : 18, color, String(i + 1), { ring: true, halo: isNext });
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

// '#rrggbb' どうしを混ぜる（t は a の割合）
function mix(a, b, t) {
  const parse = (hex) => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
  const pa = parse(a);
  const pb = parse(b);
  return `rgb(${pa.map((v, k) => Math.round(v * t + pb[k] * (1 - t))).join(', ')})`;
}

// 札（種類・役割）。outline のときは枠線だけ。戻り値は幅
function drawTag(ctx, x, y, text, { bg, ink, outline = false }) {
  ctx.font = `700 21px ${FONT}`;
  const w = ctx.measureText(text).width + 24;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 34, 8);
  if (outline) {
    ctx.strokeStyle = bg;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = bg;
    ctx.fill();
  }
  ctx.fillStyle = ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 12, y + 18);
  ctx.textBaseline = 'top';
  return w;
}

// フォントを読み込んでからカードを描く（カード表示・立体表示・AR で共通）
export async function prepareCard(problem) {
  await ensureFonts(problem);
  return renderCard(problem);
}

// 吹き出しの色（暗い面。画面の立体表示でもカメラの映像の上でも読めるように）
const BUBBLE = {
  bg: '#161a2e',
  row: '#1f2440',
  text: '#f4f5fb',
  sub: '#a9aeca',
  muted: '#868cad',
  line: '#2f3557',
  prompt: '#fcd34d',
  promptBar: '#eab308',
  promptRow: '#2a2a2e',
};

// 1つの注目箇所の吹き出し。entry = { opened, revealed }。高さは内容に合わせる
//   action: 操作の呼び方（スマホ・ARは「タップ」、PCは「クリック」）
// 画面の一覧の気づきと同じ形にする（左の線 = 注目箇所の色、札 = 気づきの種類の色）
export function renderBubble(problem, index, entry, { action = 'タップ' } = {}) {
  const focus = problem.focuses[index];
  const color = focusColor(index);
  const pad = 32;
  const rowPad = 22;
  const textX = pad + rowPad + 8;
  const textW = BUBBLE_W - textX - pad - rowPad;
  const measure = document.createElement('canvas').getContext('2d');

  const rows = focus.insights.slice(0, entry.opened).map((s, i) => {
    const answered = i < entry.revealed;
    measure.font = `700 21px ${FONT}`;
    const tagW = measure.measureText(KINDS[s.kind].label).width + 24;
    measure.font = `400 24px ${FONT}`;
    const meta = answered ? `「${s.cue}」と書いてある` : '考えてみよう';
    const metaLines = wrapLines(measure, meta, textW - tagW - 12);
    measure.font = `700 32px ${FONT}`;
    const mainLines = wrapLines(measure, answered ? `→ ${s.thought}` : promptFor(s), textW);
    const hint = answered ? null : `もう一度${action}で答え`;
    const h = rowPad + metaLines.length * 36 + 10 + mainLines.length * 46 + (hint ? 38 : 0) + rowPad - 6;
    return { s, answered, metaLines, mainLines, hint, h };
  });
  // 見出しの引用は、役割の札の右に置き、長いときは折り返す
  measure.font = `700 21px ${FONT}`;
  const quoteX = pad + 70 + measure.measureText(ROLES[focus.role].label).width + 24;
  measure.font = `700 32px ${FONT}`;
  const quoteLines = wrapLines(measure, `「${focus.quote}」`, BUBBLE_W - quoteX - pad);
  const headerH = 84 + (quoteLines.length - 1) * 44;
  const gap = 14;
  const remaining = focus.insights.length - entry.opened;
  const footerH = remaining > 0 && entry.opened === entry.revealed ? 52 : 0;
  const height = pad + headerH + rows.reduce((sum, r) => sum + r.h + gap, 0) - (rows.length ? gap : 0) + footerH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = BUBBLE_W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = BUBBLE.bg;
  ctx.beginPath();
  ctx.roundRect(3, 3, BUBBLE_W - 6, height - 6, 30);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.stroke();

  // 見出し: 番号・役割・引用
  ctx.textBaseline = 'top';
  drawNumber(ctx, pad + 22, pad + 26, 22, color, String(index + 1));
  drawTag(ctx, pad + 58, pad + 9, ROLES[focus.role].label, { bg: '#5b6185', ink: '#c3c7de', outline: true });
  ctx.fillStyle = BUBBLE.text;
  ctx.font = `700 32px ${FONT}`;
  quoteLines.forEach((l, j) => ctx.fillText(l, quoteX, pad + 8 + j * 44));
  ctx.fillStyle = BUBBLE.line;
  ctx.fillRect(pad, pad + headerH - 18, BUBBLE_W - pad * 2, 2);

  // 気づき（問いかけ）の行
  let y = pad + headerH;
  for (const r of rows) {
    const rowColor = r.answered ? color : BUBBLE.promptBar;
    ctx.fillStyle = r.answered ? BUBBLE.row : BUBBLE.promptRow;
    ctx.beginPath();
    ctx.roundRect(pad, y, BUBBLE_W - pad * 2, r.h, 18);
    ctx.fill();
    ctx.fillStyle = rowColor;
    ctx.beginPath();
    ctx.roundRect(pad, y + 14, 7, r.h - 28, [0, 4, 4, 0]);
    ctx.fill();

    let ty = y + rowPad;
    const kind = KIND_COLORS[r.s.kind];
    const tagW = drawTag(ctx, textX, ty, KINDS[r.s.kind].label, { bg: mix(kind, BUBBLE.bg, 0.4), ink: mix(kind, '#ffffff', 0.35) });
    ctx.fillStyle = r.answered ? BUBBLE.sub : BUBBLE.prompt;
    ctx.font = `${r.answered ? 400 : 700} 24px ${FONT}`;
    r.metaLines.forEach((l, j) => ctx.fillText(l, textX + tagW + 12, ty + 4 + j * 36));
    ty += r.metaLines.length * 36 + 10;

    ctx.font = `700 32px ${FONT}`;
    r.mainLines.forEach((l, j) => {
      const ly = ty + j * 46;
      ctx.fillStyle = BUBBLE.text;
      if (r.answered && j === 0 && l.startsWith('→')) {
        // 先頭の矢印だけ注目箇所の色にする
        ctx.fillStyle = mix(color, '#ffffff', 0.55);
        ctx.fillText('→', textX, ly);
        ctx.fillStyle = BUBBLE.text;
        ctx.fillText(l.slice(1), textX + ctx.measureText('→').width, ly);
      } else {
        ctx.fillText(l, textX, ly);
      }
    });
    ty += r.mainLines.length * 46;
    if (r.hint) {
      ctx.fillStyle = BUBBLE.muted;
      ctx.font = `400 24px ${FONT}`;
      ctx.fillText(`（${r.hint}）`, textX, ty + 6);
    }
    y += r.h + gap;
  }
  if (footerH) {
    ctx.fillStyle = BUBBLE.muted;
    ctx.font = `400 24px ${FONT}`;
    ctx.fillText(`もう一度${action}で次の気づき（あと${remaining}個）`, pad + 8, y - gap + 18);
  }

  return canvas;
}
