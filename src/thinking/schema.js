// 思考プロセスデータの形式定義と検証
//
// 問題文の「見る順番」に注目箇所 (focuses) を並べ、各箇所に気づき (insights) を付ける。
// 気づきは「〜と書いてあるから考えること」と「〜とは書いていないから考えること」の2種類。
//
// 手作業で書いたデータも、将来AIが生成するデータも、同じ validateThinking() を通してから使う。
// 問題文の範囲は文字位置ではなく「引用文字列 (quote)」で指定する。
// AIは文字位置の数え間違いをしやすいため、引用で指定させて機械的に位置を求める。
//
// THINKING_JSON_SCHEMA は AI に構造化出力させるときにそのまま渡せる JSON Schema。
// 形式を変えるときは、この JSON Schema と validateThinking() の両方を更新すること。

export const SCHEMA_VERSION = 2;

export const INSIGHT_KINDS = {
  written: { label: '書いてある', phrase: 'と書いてある' },
  unwritten: { label: '書いていない', phrase: 'とは書いていない' },
};

export const SOURCES = ['manual', 'ai'];

export const THINKING_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'id', 'title', 'problem', 'focuses', 'meta'],
  properties: {
    schemaVersion: { type: 'integer', enum: [SCHEMA_VERSION] },
    id: { type: 'string', description: '英数字とアンダースコアの一意なID' },
    questionId: { type: 'string', description: '対応する questions.js の問題ID（任意）' },
    title: { type: 'string' },
    subject: { type: 'string' },
    unit: { type: 'string' },
    difficulty: { type: 'string', enum: ['C', 'B', 'A', 'S'] },
    problem: { type: 'string', description: '問題文。focuses の quote はこの文字列の一部と完全一致させる' },
    focuses: {
      type: 'array',
      description: '問題文の注目箇所。見るべき順に並べる（配列の順番がそのまま番号になる）',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'quote', 'insights'],
        properties: {
          id: { type: 'string' },
          quote: { type: 'string', description: '問題文からの完全一致の引用。他の注目箇所と重ならないこと' },
          occurrence: { type: 'integer', description: '同じ引用が複数あるときの何番目か（1始まり、省略時1）' },
          insights: {
            type: 'array',
            description: 'この箇所を見て思い浮かべるべきこと。解法のまとめではなく、文面から直接読み取れる気づきを書く',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['kind', 'cue', 'thought'],
              properties: {
                kind: {
                  type: 'string',
                  enum: Object.keys(INSIGHT_KINDS),
                  description: 'written: 書いてあることからの気づき / unwritten: 書いていないことからの気づき',
                },
                cue: { type: 'string', description: '書いてある語句、または書いていない語句（例: "並べる"）' },
                thought: { type: 'string', description: 'そこから考えること（例: "順番は関係ないので nPr ではなく nCr"）' },
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
  const spans = [];
  data.focuses.forEach((f, i) => {
    const where = `focuses[${i}]`;
    if (!isStr(f.id)) err(`${where}: id が空です`);
    else if (ids.has(f.id)) err(`${where}: id "${f.id}" が重複しています`);
    else ids.add(f.id);

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
    else f.insights.forEach((s, j) => {
      const w = `${where}.insights[${j}]`;
      if (!INSIGHT_KINDS[s.kind]) err(`${w}: kind は ${Object.keys(INSIGHT_KINDS).join(' / ')} のいずれかにしてください`);
      if (!isStr(s.cue)) err(`${w}: cue が空です`);
      if (!isStr(s.thought)) err(`${w}: thought が空です`);
    });
  });

  const meta = data.meta;
  if (!meta || !SOURCES.includes(meta.source)) err(`meta.source は ${SOURCES.join(' / ')} のいずれかにしてください`);
  if (meta && typeof meta.reviewed !== 'boolean') err('meta.reviewed (true/false) が必要です');

  return errors;
}
