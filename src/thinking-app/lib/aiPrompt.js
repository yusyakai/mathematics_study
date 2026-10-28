// AI に問題データの下書きを作らせるときの指示文（作成ツールの「AI用の指示文をコピー」で使う）
// 科目・単元・役割・種類は catalog.js から組み立てるので、選択肢を変えても指示文がずれない。
// AI が出力した JSON は、作成ツールの「JSON を読み込んで作る」で取り込み、人が確認してから公開する。
import { SUBJECTS, DIFFICULTIES, ROLES, KINDS, KIND_DECISION_STEPS } from './catalog.js';
import { SCHEMA_VERSION, LIMITS } from './schema.js';

const EXAMPLE = {
  schemaVersion: SCHEMA_VERSION,
  id: 'probability_001',
  title: '確率 基本',
  subject: '数学A',
  unit: '確率',
  difficulty: 'C',
  problem: '赤玉3個、白玉5個が入った袋から2個取り出すとき、2個とも赤玉である確率を求めよ。',
  focuses: [
    {
      id: 'f1',
      quote: '2個取り出す',
      role: 'situation',
      priority: 1,
      insights: [
        { priority: 1, kind: 'interpret', cue: '取り出す', thought: '取り出すだけで並べない → 選んだ順番は関係ない' },
        { priority: 2, kind: 'select', cue: '取り出す', thought: '順番を考えないので、nPr ではなく nCr で数える' },
      ],
    },
  ],
  // モデル名は AI が正確に答えられないことがあるため空にさせ、作成ツールで人が入れる
  meta: { source: 'ai', model: '', reviewed: false },
};

export function buildAiPrompt(problemText = '（ここに問題文を貼る）') {
  const roles = Object.entries(ROLES).map(([k, v]) => `${k}（${v.label}：${v.description}）`).join('／');
  const kinds = KIND_DECISION_STEPS.map(step => `${step.kind}（${KINDS[step.kind].label}：${KINDS[step.kind].description}）`).join(' → ');
  const subjects = Object.entries(SUBJECTS).map(([s, units]) => `  ${s}（${units.join('、')}）`).join('\n');
  const difficulties = Object.entries(DIFFICULTIES).map(([k, v]) => `${k}（${v.label}）`).join('／');

  return `あなたは高校数学の教員です。次の問題について、生徒が「問題文のどこを見て」「そこに書いてあることから何を考えるか」を、下の形式の JSON で作ってください。出力は JSON だけにしてください。

# 注目箇所（focuses）
- quote は問題文からの完全一致の引用にする（空白・記号・全角半角も問題文と同じ）。注目箇所どうしは重ねない。2〜5個程度。
- role は次から選ぶ：${roles}
- priority は見る順番（1から）。目安は 問い → 状況 → 条件。

# 気づき（insights）
- 問題文に書いてあることから直接考えることだけを書く。方針のまとめ・解答・計算の流れは書かない。
- 1つの気づきには1つの考えだけ。${LIMITS.thoughtLength}字以内。1つの注目箇所に1〜3個。
- cue は、その注目箇所の quote の一部と完全一致させる。
- kind は次の順に確かめ、最初に当てはまったものにする：
  ${kinds}
- priority は1から。目安は 読み取り → 型の判定 → 解法の選択 → 注意。
- 問題全体で select（解法の選択）を1つ以上入れる。

# 基本情報
- id：半角英小文字・数字・_（例：probability_002）
- subject と unit は次から選ぶ：
${subjects}
- difficulty：${difficulties}
- 数式は x²、√2、₃C₂ のように文字で書き、LaTeX は使わない。
- meta は例と同じにする（model は空のままでよい）。

# 出力の形式（例）
${JSON.stringify(EXAMPLE, null, 2)}

# 出力した後の見直し
出力する前に、quote と cue が問題文と完全に一致しているか、方針や解答のまとめになっていないかを見直してください。

# 問題
問題文：${problemText}
`;
}
