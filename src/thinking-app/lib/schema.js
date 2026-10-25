// 思考プロセスデータの形式定義と検証
//
// 1問のデータは「問題の基本情報」「注目箇所 (focuses)」「気づき (insights)」「管理情報 (meta)」からなる。
//   注目箇所 … 問題文のどこを見るか。役割 (role) と優先順位 (priority) を持つ
//   気づき   … その箇所に書いてあること (cue) から何を考えるか (thought)。種類 (kind) と優先順位を持つ
// 各項目の意味・分類の判断基準・書き方は docs/thinking-app/data-spec.md にまとめている。
//
// 手作業で書いたデータも、AIが生成したデータも、同じ validateThinking() を通してから使う。
//   errors   … データとして使えない（一覧に表示しない）
//   warnings … 使えるが、内容の質として見直したほうがよい
// 問題文の範囲は文字位置ではなく「引用文字列」で指定する。文字位置は読み込み時に自動で求める。
//
// THINKING_JSON_SCHEMA は AI に構造化出力させるときにそのまま渡せる JSON Schema。
// 形式を変えるときは、この JSON Schema と validateThinking() の両方を更新し、SCHEMA_VERSION を上げること。
import { SUBJECTS, DIFFICULTIES, ROLES, KINDS, SOURCES } from './catalog.js';

export const SCHEMA_VERSION = 4;

// 内容の質の目安（超えると warning）
export const LIMITS = {
  thoughtLength: 60, // 1つの気づきの文字数
  insightsPerFocus: 5, // 1つの注目箇所の気づきの数
  focuses: 8, // 1問の注目箇所の数
};

const ID_PATTERN = /^[a-z0-9_]+$/;
const FOCUS_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const THINKING_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'id', 'title', 'subject', 'unit', 'difficulty', 'problem', 'focuses', 'meta'],
  properties: {
    schemaVersion: { type: 'integer', enum: [SCHEMA_VERSION] },
    id: { type: 'string', pattern: ID_PATTERN.source, description: '半角英小文字・数字・_ の一意なID（ファイル名と同じにする）' },
    title: { type: 'string', description: '一覧に出す短い題名（例: "確率 基本"）' },
    subject: { type: 'string', enum: Object.keys(SUBJECTS) },
    unit: { type: 'string', description: 'subject ごとに決められた単元名から選ぶ' },
    difficulty: { type: 'string', enum: Object.keys(DIFFICULTIES) },
    problem: { type: 'string', description: '問題文。focuses の quote と insights の cue はこの文字列の一部と完全一致させる' },
    origin: { type: 'string', description: '出典（例: "自作", "教科書p.52 例題3"）' },
    focuses: {
      type: 'array',
      description: '問題文の注目箇所',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'quote', 'role', 'priority', 'insights'],
        properties: {
          id: { type: 'string', pattern: FOCUS_ID_PATTERN.source, description: '問題の中で一意なID（例: "f1"）' },
          quote: { type: 'string', description: '問題文からの完全一致の引用。他の注目箇所と重ならないこと' },
          occurrence: { type: 'integer', minimum: 1, description: '同じ引用が問題文に複数あるときの何番目か（1始まり、省略時1）' },
          role: {
            type: 'string',
            enum: Object.keys(ROLES),
            description: Object.entries(ROLES).map(([k, v]) => `${k}: ${v.label}（${v.description}）`).join(' / '),
          },
          priority: { type: 'integer', minimum: 1, description: '注目箇所どうしの優先順位（見る順番）。1が最優先で、問題の中で重複しない' },
          insights: {
            type: 'array',
            description: 'この箇所に書いてあることから考えること。1つの気づきには1つの考えだけを書く',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['priority', 'kind', 'cue', 'thought'],
              properties: {
                priority: { type: 'integer', minimum: 1, description: 'この注目箇所の中での優先順位。1が最優先で、重複しない' },
                kind: {
                  type: 'string',
                  enum: Object.keys(KINDS),
                  description: Object.entries(KINDS).map(([k, v]) => `${k}: ${v.label}（${v.description}）`).join(' / '),
                },
                cue: { type: 'string', description: '手がかりになる語句。注目箇所の quote の一部と完全一致させる' },
                thought: { type: 'string', description: `そこから考えること。1文で、${LIMITS.thoughtLength}字以内を目安に` },
              },
            },
          },
        },
      },
    },
    meta: {
      type: 'object',
      additionalProperties: false,
      required: ['source', 'reviewed'],
      properties: {
        source: { type: 'string', enum: Object.keys(SOURCES) },
        model: { type: 'string', description: 'AI生成の場合の使用モデル' },
        reviewed: { type: 'boolean', description: '人が内容を確認済みか（AI生成は確認するまで false）' },
      },
    },
  },
};

// 引用文字列から [開始, 終了) 位置を求める。from 以降、to 以前で探す。見つからなければ null
export function locateQuote(text, quote, occurrence = 1, from = 0, to = text.length) {
  let pos = from;
  for (let n = 1; ; n++) {
    const start = text.indexOf(quote, pos);
    if (start === -1 || start + quote.length > to) return null;
    if (n === occurrence) return [start, start + quote.length];
    pos = start + 1;
  }
}

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isPriority = (v) => Number.isInteger(v) && v >= 1;
const isContiguous = (priorities) => [...priorities].sort((a, b) => a - b).every((p, i) => p === i + 1);

export function validateThinking(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { errors: ['データがオブジェクトではありません'], warnings };
  }

  // 問題の基本情報
  if (data.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion は ${SCHEMA_VERSION} にしてください`);
  if (!isStr(data.id)) errors.push('id が空です');
  else if (!ID_PATTERN.test(data.id)) errors.push(`id "${data.id}" は半角英小文字・数字・_ だけにしてください`);
  if (!isStr(data.title)) errors.push('title（題名）が空です');
  if (!isStr(data.problem)) errors.push('problem（問題文）が空です');
  if (!SUBJECTS[data.subject]) {
    errors.push(`subject（科目）は ${Object.keys(SUBJECTS).join(' / ')} のいずれかにしてください`);
  } else if (!SUBJECTS[data.subject].includes(data.unit)) {
    errors.push(`unit（単元）"${data.unit ?? ''}" は ${data.subject} の単元（${SUBJECTS[data.subject].join(' / ')}）から選んでください`);
  }
  if (!DIFFICULTIES[data.difficulty]) errors.push(`difficulty（難易度）は ${Object.keys(DIFFICULTIES).join(' / ')} のいずれかにしてください`);
  if (data.origin !== undefined && typeof data.origin !== 'string') errors.push('origin（出典）は文字列にしてください');

  // 管理情報
  const meta = data.meta;
  if (!meta || typeof meta !== 'object') {
    errors.push('meta（管理情報）がありません');
  } else {
    if (!SOURCES[meta.source]) errors.push(`meta.source は ${Object.keys(SOURCES).join(' / ')} のいずれかにしてください`);
    if (typeof meta.reviewed !== 'boolean') errors.push('meta.reviewed（確認済みか）を true / false で指定してください');
    if (meta.source === 'ai' && !isStr(meta.model)) warnings.push('AI生成のデータは meta.model に使用モデルを書いてください');
  }

  if (!Array.isArray(data.focuses) || data.focuses.length === 0) {
    errors.push('focuses（注目箇所）が1つもありません');
    return { errors, warnings };
  }
  if (data.focuses.length > LIMITS.focuses) {
    warnings.push(`注目箇所が ${data.focuses.length} 個あります。${LIMITS.focuses} 個以内に絞ると見やすくなります`);
  }

  // 注目箇所
  const problem = isStr(data.problem) ? data.problem : '';
  const focusIds = new Set();
  const focusPriorities = [];
  const spans = [];
  const thoughts = new Set();
  let hasQuestion = false;
  let hasSelect = false;

  data.focuses.forEach((f, i) => {
    const where = `注目箇所${i + 1}${isStr(f?.quote) ? `「${f.quote}」` : ''}`;
    if (!f || typeof f !== 'object') return errors.push(`${where}: オブジェクトではありません`);

    if (!isStr(f.id)) errors.push(`${where}: id が空です`);
    else if (!FOCUS_ID_PATTERN.test(f.id)) errors.push(`${where}: id "${f.id}" は半角英数字・_・- だけにしてください`);
    else if (focusIds.has(f.id)) errors.push(`${where}: id "${f.id}" が重複しています`);
    else focusIds.add(f.id);

    if (!ROLES[f.role]) errors.push(`${where}: role（役割）は ${Object.keys(ROLES).join(' / ')} のいずれかにしてください`);
    if (f.role === 'question') hasQuestion = true;

    if (!isPriority(f.priority)) errors.push(`${where}: priority は1以上の整数にしてください`);
    else if (focusPriorities.includes(f.priority)) errors.push(`${where}: priority ${f.priority} が他の注目箇所と重複しています`);
    else focusPriorities.push(f.priority);

    let span = null;
    if (f.occurrence !== undefined && !isPriority(f.occurrence)) errors.push(`${where}: occurrence は1以上の整数にしてください`);
    if (!isStr(f.quote)) errors.push(`${where}: quote（引用）が空です`);
    else if (problem) {
      span = locateQuote(problem, f.quote, f.occurrence ?? 1);
      if (!span) errors.push(`${where}: 引用が問題文に見つかりません（空白や記号も完全に一致させてください）`);
      else {
        const other = spans.find(s => s.span[0] < span[1] && span[0] < s.span[1]);
        if (other) errors.push(`${where}: 注目箇所「${other.quote}」と範囲が重なっています`);
        spans.push({ span, quote: f.quote });
      }
    }

    if (!Array.isArray(f.insights) || f.insights.length === 0) {
      errors.push(`${where}: insights（気づき）が1つもありません`);
      return;
    }
    if (f.insights.length > LIMITS.insightsPerFocus) {
      warnings.push(`${where}: 気づきが ${f.insights.length} 個あります。${LIMITS.insightsPerFocus} 個以内に絞るか、注目箇所を分けてください`);
    }

    const insightPriorities = [];
    f.insights.forEach((s, j) => {
      const w = `${where}の気づき${j + 1}`;
      if (!s || typeof s !== 'object') return errors.push(`${w}: オブジェクトではありません`);
      if (!isPriority(s.priority)) errors.push(`${w}: priority は1以上の整数にしてください`);
      else if (insightPriorities.includes(s.priority)) errors.push(`${w}: priority ${s.priority} が同じ注目箇所の中で重複しています`);
      else insightPriorities.push(s.priority);

      if (!KINDS[s.kind]) errors.push(`${w}: kind（種類）は ${Object.keys(KINDS).join(' / ')} のいずれかにしてください`);
      if (s.kind === 'select') hasSelect = true;

      if (!isStr(s.cue)) errors.push(`${w}: cue（手がかりの語句）が空です`);
      else if (isStr(f.quote) && !f.quote.includes(s.cue)) errors.push(`${w}: cue「${s.cue}」は注目箇所の引用「${f.quote}」の一部にしてください`);

      if (!isStr(s.thought)) errors.push(`${w}: thought（考えること）が空です`);
      else {
        if ([...s.thought].length > LIMITS.thoughtLength) {
          warnings.push(`${w}: ${[...s.thought].length} 字あります。1つの気づきは ${LIMITS.thoughtLength} 字以内を目安に、長い場合は分けてください`);
        }
        if (thoughts.has(s.thought)) warnings.push(`${w}: 同じ内容の気づきが他にもあります`);
        thoughts.add(s.thought);
      }
    });
    if (insightPriorities.length === f.insights.length && !isContiguous(insightPriorities)) {
      warnings.push(`${where}: 気づきの priority が 1 から順に並んでいません（${insightPriorities.join(', ')}）`);
    }
  });

  if (focusPriorities.length === data.focuses.length && !isContiguous(focusPriorities)) {
    warnings.push(`注目箇所の priority が 1 から順に並んでいません（${focusPriorities.join(', ')}）`);
  }
  if (!hasQuestion) warnings.push('「問い」（role: question）の注目箇所がありません。何を求めるかが書かれた部分を入れてください');
  if (!hasSelect) warnings.push('「解法の選択」（kind: select）の気づきがありません');

  return { errors, warnings };
}
