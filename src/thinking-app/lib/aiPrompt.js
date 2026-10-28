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
  const kinds = KIND_DECISION_STEPS.map(step => `${step.kind}（${KINDS[step.kind].label}：${step.question}）`).join('\n  → ');
  const subjects = Object.entries(SUBJECTS).map(([s, units]) => `  ${s}（${units.join('、')}）`).join('\n');
  const difficulties = Object.entries(DIFFICULTIES).map(([k, v]) => `${k}（${v.label}）`).join('／');

  return `あなたは高校数学の教員です。次の問題について、生徒が「問題文のどこを見て」「そこに書いてあることから何を考えるか」を、下の形式の JSON で作ってください。出力は JSON だけにしてください。

# 注目箇所（focuses）
- quote は問題文からの完全一致の引用にする（空白・記号・全角半角も問題文と同じ）。注目箇所どうしは重ねない。2〜5個程度。
- role は次から選ぶ：${roles}
- priority は見る順番（1から）。目安は 問い → 状況 → 条件。

# 気づき（insights）
気づきとは「問題文のこの語句が書いてあるから、解くときにこう考える・こう決める」というものです。生徒が見落としやすい判断を優先して書いてください。

## 書いてよいもの・書かないもの
- 書く：語句の意味の読み取り、問題の型の見抜き、使う公式・手法の選択、その問題に特有の注意点。
- 使う公式や式の形（例：₈C₂、(x + y)² − 2xy）を示すところまでは書いてよい。
- 書かない：計算の結果、答え、解き方の手順の全体、どの問題にも言える一般論（「計算ミスに注意」「よく読む」など）。

## 1つの気づきの条件（すべて満たすものだけを書く）
1. 差し替えテスト：その語句が別の語句だったら（例：「取り出す」→「並べる」）、考えや判断が変わる。変わらないなら書かない。
2. 1つの気づきには1つの判断だけ。読み取り → 解法の選択のように種類の違う考えが続くときは、気づきを分ける。
3. 1文で${LIMITS.thoughtLength}字以内。「〜なので → 〜」のように、根拠から判断へ1回だけつなげてよい。
4. 同じ内容を別の注目箇所にも書かない（いちばん直接の手がかりになる注目箇所に1回だけ書く）。

## 個数
- 1つの注目箇所に必要な数だけ（多くは1〜2個）。数を埋めるために増やさない。
- 問題全体で4〜8個程度。select（解法の選択）を1つ以上入れる。

## cue
- その注目箇所の quote の一部と完全一致させる。判断の決め手になる最小の語句にする（例：「2個取り出す」ではなく「取り出す」）。

## kind（次の順に確かめ、最初に当てはまったものにする）
  ${kinds}
- caution は、その問題に特有のものだけにする（一般論は書かない）。

## priority
1から。目安は 読み取り → 型の判定 → 解法の選択 → 注意（「読む → わかる → 決める → 確かめる」の順）。

## 例
○ cue「取り出す」→ interpret「取り出すだけで並べない → 選んだ順番は関係ない」
○ cue「取り出す」→ select「順番を考えないので、nPr ではなく nCr で数える」
○ cue「≤」→ caution「等号つきなので、端の x = 0, 3 も範囲に含まれる」
× cue「2個取り出す」→「袋から2個を取り出す」（言い換えだけで判断につながらない）
× cue「確率」→「₃C₂ ÷ ₈C₂ = 3/28」（計算結果・答えを書いている）
× cue「x² + y²」→「計算ミスに注意する」（どの問題にも言える一般論）
× 1つの気づきに「並べない → 順番は関係ない → nCr で数える」（読み取りと解法の選択を混ぜている）

# 基本情報
- id：半角英小文字・数字・_（例：probability_002）
- subject と unit は次から選ぶ：
${subjects}
- difficulty：${difficulties}
- 数式は x²、√2、₃C₂ のように文字で書き、LaTeX は使わない。
- meta は例と同じにする（model は空のままでよい）。

# 出力の形式（例）
${JSON.stringify(EXAMPLE, null, 2)}

# 出力する前の見直し
- quote と cue が問題文と完全に一致しているか。
- すべての気づきが「1つの気づきの条件」1〜4を満たし、「書かないもの」に当てはまらないか。当てはまるものは削るか直す。

# 問題
問題文：${problemText}
`;
}
