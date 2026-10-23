// 思考プロセスデータの形式定義と検証
//
// 問題文の注目箇所 (focuses) と、各箇所から考えること (insights) を持つ。
// 優先順位は2段階:
//   focuses[].priority            … 注目箇所どうしの優先順位（1が最優先。表示する番号になる）
//   focuses[].insights[].priority … その注目箇所の中での気づきの優先順位（1から順に1個ずつ表示）
// 気づきはいまは「書いてあること」から考えるものだけを扱う。
//
// 手作業で書いたデータも、将来AIが生成するデータも、同じ validateThinking() を通してから使う。
// 問題文の範囲は文字位置ではなく「引用文字列 (quote)」で指定する。
// AIは文字位置の数え間違いをしやすいため、引用で指定させて機械的に位置を求める。
//
// THINKING_JSON_SCHEMA は AI に構造化出力させるときにそのまま渡せる JSON Schema。
// 形式を変えるときは、この JSON Schema と validateThinking() の両方を更新すること。

export const SCHEMA_VERSION = 3;

export const SOURCES = ['manual', 'ai'];

export const THINKING_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'id', 'title', 'problem', 'focuses', 'meta'],
  properties: {
    schemaVersion: { type: 'integer', enum: [SCHEMA_VERSION] },
    id: { type: 'string', description: '英数字とアンダースコアの一意なID' },
    title: { type: 'string' },
    subject: { type: 'string' },
    unit: { type: 'string' },
    difficulty: { type: 'string', enum: ['C', 'B', 'A', 'S'] },
    problem: { type: 'string', description: '問題文。focuses の quote はこの文字列の一部と完全一致させる' },
    focuses: {
      type: 'array',
      description: '問題文の注目箇所',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'quote', 'priority', 'insights'],
        properties: {
          id: { type: 'string' },
          quote: { type: 'string', description: '問題文からの完全一致の引用。他の注目箇所と重ならないこと' },
          occurrence: { type: 'integer', description: '同じ引用が複数あるときの何番目か（1始まり、省略時1）' },
          priority: { type: 'integer', description: '注目箇所どうしの優先順位。1が最優先で、問題ごとに重複しない' },
          insights: {
            type: 'array',
            description: 'この箇所に書いてあることから考えること。解法のまとめではなく、文面から直接読み取れる気づきを書く',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['priority', 'cue', 'thought'],
              properties: {
                priority: { type: 'integer', description: 'この注目箇所の中での優先順位。1が最優先で、重複しない' },
                cue: { type: 'string', description: '問題文に書いてある語句（例: "取り出す"）' },
                thought: { type: 'string', description: 'そこから考えること（例: "並べないので順番は関係ない → nCr で数える"）' },
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
        source: { type: 'string', enum: SOURCES },
        model: { type: 'string', description: 'AI生成の場合の使用モデル' },
        reviewed: { type: 'boolean', description: '人が内容を確認済みか' },
      },
    },
  },
};

// 引用文字列から問題文中の [開始, 終了) 位置を求める。見つからなければ null
export function locateQuote(problem, quote, occurrence = 1) {
  let from = 0;
  for (let n = 1; ; n++) {
    const start = problem.indexOf(quote, from);
    if (start === -1) return null;
    if (n === occurrence) return [start, start + quote.length];
    from = start + 1;
  }
}

const isPriority = (v) => Number.isInteger(v) && v >= 1;

// エラーメッセージの配列を返す（空なら妥当）
export function validateThinking(data) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  const isStr = (v) => typeof v === 'string' && v.trim() !== '';

  if (!data || typeof data !== 'object') return ['データがオブジェクトではありません'];
  if (data.schemaVersion !== SCHEMA_VERSION) err(`schemaVersion は ${SCHEMA_VERSION} にしてください`);
  for (const key of ['id', 'title', 'problem']) {
    if (!isStr(data[key])) err(`${key} が空です`);
  }
  if (!Array.isArray(data.focuses) || data.focuses.length === 0) err('focuses が1つもありません');
  if (errors.length) return errors;

  const ids = new Set();
  const focusPriorities = new Set();
  const spans = [];
  data.focuses.forEach((f, i) => {
    const where = `focuses[${i}]`;
    if (!isStr(f.id)) err(`${where}: id が空です`);
    else if (ids.has(f.id)) err(`${where}: id "${f.id}" が重複しています`);
    else ids.add(f.id);

    if (!isPriority(f.priority)) err(`${where}: priority は1以上の整数にしてください`);
    else if (focusPriorities.has(f.priority)) err(`${where}: priority ${f.priority} が他の注目箇所と重複しています`);
    else focusPriorities.add(f.priority);

    if (!isStr(f.quote)) err(`${where}: quote が空です`);
    else {
      const span = locateQuote(data.problem, f.quote, f.occurrence ?? 1);
      if (!span) err(`${where}: quote "${f.quote}" が問題文に見つかりません`);
      else {
        const other = spans.find(s => s.span[0] < span[1] && span[0] < s.span[1]);
        if (other) err(`${where}: quote "${f.quote}" が "${other.quote}" と重なっています`);
        spans.push({ span, quote: f.quote });
      }
    }

    if (!Array.isArray(f.insights) || f.insights.length === 0) err(`${where}: insights が1つもありません`);
    else {
      const insightPriorities = new Set();
      f.insights.forEach((s, j) => {
        const w = `${where}.insights[${j}]`;
        if (!isPriority(s.priority)) err(`${w}: priority は1以上の整数にしてください`);
        else if (insightPriorities.has(s.priority)) err(`${w}: priority ${s.priority} が同じ注目箇所の中で重複しています`);
        else insightPriorities.add(s.priority);
        if (!isStr(s.cue)) err(`${w}: cue が空です`);
        if (!isStr(s.thought)) err(`${w}: thought が空です`);
      });
    }
  });

  const meta = data.meta;
  if (!meta || !SOURCES.includes(meta.source)) err(`meta.source は ${SOURCES.join(' / ')} のいずれかにしてください`);
  if (meta && typeof meta.reviewed !== 'boolean') err('meta.reviewed (true/false) が必要です');

  return errors;
}
