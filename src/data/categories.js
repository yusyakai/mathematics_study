// カテゴリ（科目）と単元の定義
// 問題追加時は subject と unit をこの中から選んでください

export const SUBJECTS = {
  中学数学: {
    label: "中学数学",
    color: "#6366f1",
    units: [
      "正負の数", "文字式", "一次方程式", "連立方程式",
      "一次関数", "比例・反比例", "平面図形", "空間図形",
      "合同・相似", "三平方の定理", "確率", "資料の活用"
    ]
  },
  数学I: {
    label: "数学Ⅰ",
    color: "#3b82f6",
    units: [
      "数と式", "集合と命題", "二次関数", "二次不等式",
      "三角比", "データの分析"
    ]
  },
  数学A: {
    label: "数学A",
    color: "#06b6d4",
    units: [
      "場合の数", "確率", "図形の性質", "整数の性質"
    ]
  },
  数学II: {
    label: "数学Ⅱ",
    color: "#10b981",
    units: [
      "式と証明", "複素数と方程式", "図形と方程式",
      "三角関数", "指数・対数関数", "微分", "積分"
    ]
  },
  数学B: {
    label: "数学B",
    color: "#f59e0b",
    units: [
      "数列", "統計的な推測"
    ]
  },
  数学III: {
    label: "数学Ⅲ",
    color: "#ef4444",
    units: [
      "極限", "微分法", "積分法", "複素数平面", "式と曲線"
    ]
  },
  数学C: {
    label: "数学C",
    color: "#ec4899",
    units: [
      "ベクトル", "平面上の曲線", "複素数平面"
    ]
  },
};

// 難易度定義
export const DIFFICULTIES = {
  C: { label: "C：基本", description: "教科書レベル", color: "#10b981" },
  B: { label: "B：応用", description: "教科書応用レベル", color: "#3b82f6" },
  A: { label: "A：入試対策", description: "入試対策レベル", color: "#f59e0b" },
  S: { label: "S：実践", description: "共通テスト等の実践レベル", color: "#ef4444" },
};

export const DIFFICULTY_ORDER = ["C", "B", "A", "S"];
