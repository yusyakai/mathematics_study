// 問題データ
// 各問題は2〜3STEPで構成、選択肢はデフォルト4つ（3つも可）
//
// フィールド説明:
//   subject: "中学数学" | "数学I" | "数学A" | "数学II" | "数学B" | "数学III" | "数学C"
//   unit: categories.js の各科目の units から選択
//   difficulty: "C"(基本) | "B"(応用) | "A"(入試対策) | "S"(実践)
//   tags: 自由なタグ（検索・復習用）
//   choices: 選択肢（デフォルト4つ推奨、3つも可）
//   correct: 正解の選択肢インデックス（0始まり）
//
// 問題を追加する際はこの配列に追加してください

const questions = [
  {
    id: "symmetry_001",
    title: "対称式 基本",
    subject: "数学I",
    unit: "数と式",
    difficulty: "C",
    problem: "x + y = 3, xy = 2 のとき、x² + y² の値を求めよ。",
    steps: [
      {
        question: "この問題はどのタイプ？",
        choices: ["対称式", "恒等式", "連立方程式", "不等式"],
        correct: 0,
        explanation_correct: "x + y と xy が与えられ、x² + y² を求める問題は対称式の典型です。",
        explanation_wrong: "条件として x + y と xy が与えられているため、対称式の問題です。恒等式は任意の値で成り立つ等式、連立方程式は個別の値を求める問題です。"
      },
      {
        question: "どの公式を使う？",
        choices: ["x² + y² = (x+y)² − 2xy", "x² + y² = (x−y)² + 2xy", "x² + y² = (x+y)(x−y)", "x² + y² = (x+y)² − xy"],
        correct: 0,
        explanation_correct: "x² + y² = (x+y)² − 2xy を使えば、与えられた x+y=3, xy=2 から直接計算できます。",
        explanation_wrong: "与えられた条件 x+y, xy をそのまま代入できる公式は x² + y² = (x+y)² − 2xy です。"
      }
    ],
    tags: ["対称式", "二次式"]
  },
  {
    id: "symmetry_002",
    title: "対称式 応用",
    subject: "数学I",
    unit: "数と式",
    difficulty: "B",
    problem: "x + y = 5, xy = 6 のとき、x³ + y³ の値を求めよ。",
    steps: [
      {
        question: "この問題はどのタイプ？",
        choices: ["対称式", "因数分解", "三次方程式", "恒等式"],
        correct: 0,
        explanation_correct: "x + y, xy から x³ + y³ を求めるのは対称式の応用問題です。",
        explanation_wrong: "x + y と xy が条件として与えられ、対称式 x³ + y³ を求める問題です。"
      },
      {
        question: "x³ + y³ を展開するのに使う公式は？",
        choices: [
          "x³+y³ = (x+y)³ − 3xy(x+y)",
          "x³+y³ = (x+y)(x²−xy+y²)",
          "x³+y³ = (x+y)³ − (xy)³",
          "x³+y³ = (x+y)³ − 3(x+y)"
        ],
        correct: 0,
        explanation_correct: "(x+y)³ − 3xy(x+y) を使えば、与えられた x+y と xy だけで計算できます。",
        explanation_wrong: "選択肢2も正しい公式ですが、x²−xy+y² を別途求める必要があります。最も効率的なのは (x+y)³ − 3xy(x+y) です。"
      },
      {
        question: "この問題で注意すべき点は？",
        choices: [
          "x+y と xy を直接代入する",
          "x, y を個別に求めてから代入する",
          "グラフを描いて確認する",
          "因数定理を利用する"
        ],
        correct: 0,
        explanation_correct: "対称式では x, y を個別に求める必要はなく、基本対称式 (x+y, xy) を直接代入するのがポイントです。",
        explanation_wrong: "対称式の最大の利点は、個別の値を求めずに基本対称式を直接代入できることです。"
      }
    ],
    tags: ["対称式", "三次式"]
  },
  {
    id: "quadratic_001",
    title: "二次関数 最大最小",
    subject: "数学I",
    unit: "二次関数",
    difficulty: "C",
    problem: "y = x² − 4x + 5 の最小値を求めよ。",
    steps: [
      {
        question: "最小値を求めるために、まず何をする？",
        choices: ["平方完成する", "微分する", "因数分解する", "判別式を求める"],
        correct: 0,
        explanation_correct: "二次関数の最大・最小は平方完成で頂点を求めるのが基本です。",
        explanation_wrong: "二次関数の最小値は平方完成して頂点を求めます。微分は高校数学IIIの手法で、ここでは不要です。"
      },
      {
        question: "y = x² − 4x + 5 を平方完成すると？",
        choices: [
          "y = (x−2)² + 1",
          "y = (x−4)² + 5",
          "y = (x+2)² − 1",
          "y = (x−2)² − 1"
        ],
        correct: 0,
        explanation_correct: "x² − 4x + 5 = (x−2)² − 4 + 5 = (x−2)² + 1 です。",
        explanation_wrong: "平方完成: x² − 4x = (x−2)² − 4 なので、y = (x−2)² − 4 + 5 = (x−2)² + 1 です。"
      }
    ],
    tags: ["二次関数", "最大最小"]
  },
  {
    id: "quadratic_002",
    title: "二次関数 定義域制限",
    subject: "数学I",
    unit: "二次関数",
    difficulty: "B",
    problem: "y = x² − 2x + 3 (0 ≤ x ≤ 3) の最大値と最小値を求めよ。",
    steps: [
      {
        question: "定義域が制限されている場合、まず何を確認する？",
        choices: [
          "頂点が定義域内にあるか",
          "y切片の値",
          "判別式の符号",
          "x軸との交点"
        ],
        correct: 0,
        explanation_correct: "定義域制限付きの最大最小では、頂点が定義域内にあるかどうかで場合分けが変わります。",
        explanation_wrong: "定義域が制限されている場合、頂点の位置が定義域内かどうかが最も重要な判断ポイントです。"
      },
      {
        question: "y = (x−1)² + 2 で、0 ≤ x ≤ 3 のとき最大値はどこで取る？",
        choices: [
          "x = 3（定義域の端）",
          "x = 1（頂点）",
          "x = 0（定義域の端）",
          "x = 2（中間点）"
        ],
        correct: 0,
        explanation_correct: "下に凸の放物線では、頂点で最小値を取り、頂点から遠い方の端で最大値を取ります。x=3 の方が x=0 より頂点から遠いので、x=3 で最大値を取ります。",
        explanation_wrong: "下に凸の放物線の最大値は定義域の端で取ります。頂点 x=1 からの距離を比較すると、x=3 の方が遠いので x=3 で最大値です。"
      }
    ],
    tags: ["二次関数", "最大最小", "定義域"]
  },
  {
    id: "probability_001",
    title: "確率 基本",
    subject: "数学A",
    unit: "確率",
    difficulty: "C",
    problem: "赤玉3個、白玉5個が入った袋から2個取り出すとき、2個とも赤玉である確率を求めよ。",
    steps: [
      {
        question: "この確率の求め方は？",
        choices: [
          "組合せ（C）を使う",
          "順列（P）を使う",
          "樹形図を描く",
          "余事象を使う"
        ],
        correct: 0,
        explanation_correct: "「取り出す」問題で順序を区別しないので、組合せ（C）を使います。",
        explanation_wrong: "玉を取り出す問題で順序を区別しない場合は、組合せ（C）が適切です。"
      },
      {
        question: "正しい立式は？",
        choices: [
          "₃C₂ / ₈C₂",
          "3/8 × 2/7",
          "3/8 × 5/7",
          "₃P₂ / ₈P₂"
        ],
        correct: 0,
        explanation_correct: "全体8個から2個選ぶ ₈C₂ が分母、赤3個から2個選ぶ ₃C₂ が分子です。（なお選択肢2も同じ答えになりますが、組合せで考えるのが基本です）",
        explanation_wrong: "組合せで考えます。分母は全体から2個選ぶ ₈C₂、分子は赤玉から2個選ぶ ₃C₂ です。"
      }
    ],
    tags: ["確率", "組合せ"]
  }
];

export default questions;
