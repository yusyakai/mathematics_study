// 思考プロセスデータの形式定義と検証
//
// 手作業で書いたデータも、将来AIが生成するデータも、同じ validateThinking() を通してから使う。
// 問題文の範囲は文字位置ではなく「引用文字列 (quote)」で指定する。
// AIは文字位置の数え間違いをしやすいため、引用で指定させて機械的に位置を求める。
//
// THINKING_JSON_SCHEMA は AI に構造化出力させるときにそのまま渡せる JSON Schema。
// 形式を変えるときは、この JSON Schema と validateThinking() の両方を更新すること。

export const SCHEMA_VERSION = 1;

// 思考の段階（表示順もこの順）
export const STAGES = {
  notice: { label: '気づき', order: 1 },
  strategy: { label: '方針', order: 2 },
  execute: { label: '実行', order: 3 },
};

export const SOURCES = ['manual', 'ai'];

export const THINKING_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'id', 'title', 'problem', 'triggers', 'thoughts', 'meta'],
  properties: {
    schemaVersion: { type: 'integer', enum: [SCHEMA_VERSION] },
    id: { type: 'string', description: '英数字とアンダースコアの一意なID' },
    questionId: { type: 'string', description: '対応する questions.js の問題ID（任意）' },
    title: { type: 'string' },
    subject: { type: 'string' },
    unit: { type: 'string' },
    difficulty: { type: 'string', enum: ['C', 'B', 'A', 'S'] },
    problem: { type: 'string', description: '問題文。triggers の quote はこの文字列の一部と完全一致させる' },
    triggers: {
      type: 'array',
      description: '問題文の中で、解法を決める手がかりになる箇所',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'quote', 'note'],
        properties: {
          id: { type: 'string' },
          quote: { type: 'string', description: '問題文からの完全一致の引用' },
          occurrence: { type: 'integer', description: '同じ引用が複数あるときの何番目か（1始まり、省略時1）' },
          note: { type: 'string', description: 'この箇所から読み取れること' },
        },
      },
    },
    thoughts: {
      type: 'array',
      description: '気づき→方針→実行の順に並べた思考ノード。from は自分より前のノードかトリガーのみ参照する',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'stage', 'from', 'text'],
        properties: {
          id: { type: 'string' },
          stage: { type: 'string', enum: Object.keys(STAGES) },
          from: { type: 'array', items: { type: 'string' } },
          text: { type: 'string' },
          adopted: { type: 'boolean', description: 'stage が strategy のとき必須。採用した方針なら true' },
          reason: { type: 'string', description: '採用しない方針の理由（adopted が false のとき必須）' },
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
  if (!Array.isArray(data.triggers) || data.triggers.length === 0) err('triggers が1つもありません');
  if (!Array.isArray(data.thoughts) || data.thoughts.length === 0) err('thoughts が1つもありません');
  if (errors.length) return errors;

  // 参照可能なID（トリガー＋自分より前の思考ノード）
  const known = new Set();
  const addId = (id, where) => {
    if (!isStr(id)) return err(`${where}: id が空です`);
    if (known.has(id)) return err(`${where}: id "${id}" が重複しています`);
    known.add(id);
  };

  data.triggers.forEach((t, i) => {
    const where = `triggers[${i}]`;
    addId(t.id, where);
    if (!isStr(t.quote)) err(`${where}: quote が空です`);
    else if (!locateQuote(data.problem, t.quote, t.occurrence ?? 1)) {
      err(`${where}: quote "${t.quote}" が問題文に見つかりません`);
    }
    if (!isStr(t.note)) err(`${where}: note が空です`);
  });

  let lastOrder = 0;
  let adoptedCount = 0;
  data.thoughts.forEach((n, i) => {
    const where = `thoughts[${i}]`;
    const stage = STAGES[n.stage];
    if (!stage) err(`${where}: stage "${n.stage}" は ${Object.keys(STAGES).join(' / ')} のいずれかにしてください`);
    else if (stage.order < lastOrder) err(`${where}: 気づき→方針→実行の順に並べてください`);
    else lastOrder = stage.order;

    if (!Array.isArray(n.from) || n.from.length === 0) err(`${where}: from が空です`);
    else n.from.forEach((ref) => {
      if (!known.has(ref)) err(`${where}: from "${ref}" は前に定義されたトリガーか思考ノードを指定してください`);
    });
    if (!isStr(n.text)) err(`${where}: text が空です`);

    if (n.stage === 'strategy') {
      if (typeof n.adopted !== 'boolean') err(`${where}: 方針には adopted (true/false) が必要です`);
      if (n.adopted) adoptedCount++;
      if (n.adopted === false && !isStr(n.reason)) err(`${where}: 採用しない方針には reason が必要です`);
    }
    addId(n.id, where);
  });
  if (adoptedCount === 0) err('採用した方針 (adopted: true) が1つもありません');

  const meta = data.meta;
  if (!meta || !SOURCES.includes(meta.source)) err(`meta.source は ${SOURCES.join(' / ')} のいずれかにしてください`);
  if (meta && typeof meta.reviewed !== 'boolean') err('meta.reviewed (true/false) が必要です');

  return errors;
}
