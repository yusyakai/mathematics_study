// 入力項目の選択肢（分類の定義）
// 手作業でもAIでも同じ選択肢から選ぶことで、分類の表記ゆれを防ぐ。
// 定義の説明と判断基準は docs/thinking-app/data-spec.md にまとめている。選択肢を変えるときは両方を更新する。

// 科目と単元（高等学校は2022年度からの学習指導要領の科目構成）
export const SUBJECTS = {
  中学数学: [
    '正負の数', '文字式', '一次方程式', '比例・反比例', '平面図形', '空間図形', 'データの活用',
    '式の計算', '連立方程式', '一次関数', '図形の性質と合同', '確率',
    '展開と因数分解', '平方根', '二次方程式', '関数y=ax²', '相似', '円', '三平方の定理', '標本調査',
  ],
  数学I: ['数と式', '集合と命題', '二次関数', '図形と計量', 'データの分析'],
  数学A: ['場合の数', '確率', '図形の性質', '数学と人間の活動'],
  数学II: ['式と証明', '複素数と方程式', '図形と方程式', '三角関数', '指数関数・対数関数', '微分法', '積分法'],
  数学B: ['数列', '統計的な推測', '数学と社会生活'],
  数学III: ['極限', '微分法', '積分法'],
  数学C: ['ベクトル', '平面上の曲線と複素数平面', '数学的な表現の工夫'],
};

export const DIFFICULTIES = {
  C: { label: '基本', description: '教科書の例題レベル' },
  B: { label: '応用', description: '教科書の章末問題レベル' },
  A: { label: '入試対策', description: '大学入試の標準レベル' },
  S: { label: '実践', description: '共通テスト・二次試験の実践レベル' },
};

// 注目箇所の役割: 問題文のその部分に「何が書かれているか」
export const ROLES = {
  question: { label: '問い', description: '何を求めるか・何を示すかが書かれている部分' },
  condition: { label: '条件', description: '数・式・範囲・制約など、解くときに使う条件が書かれている部分' },
  situation: { label: '状況', description: '操作・試行・図形の配置など、問題の場面が書かれている部分' },
};

// 気づきの種類: そこから「どんな考え方をするか」
//   prompt は「考えてから見る」で答えの前に出す問いかけ（{cue} が手がかりの語句に置き換わる）
export const KINDS = {
  interpret: {
    label: '読み取り',
    description: '書いてあることの意味・数量・性質を言い換える（新しい判断は含まない）',
    prompt: '「{cue}」から何が読み取れる？',
  },
  identify: {
    label: '型の判定',
    description: '問題がどの型・どの分野の考え方を使う場面かを見抜く',
    prompt: '「{cue}」から、どんな型の問題とわかる？',
  },
  select: {
    label: '解法の選択',
    description: '使う公式・手法・手順を決める',
    prompt: '「{cue}」から、どの解き方を選ぶ？',
  },
  caution: {
    label: '注意',
    description: '間違えやすい点・確認が必要な点・場合分けの必要に気づく',
    prompt: '「{cue}」で気をつけることは？',
  },
};

// 気づきの種類に迷ったときの判断順（上から順に当てはまるかを確かめ、最初に当てはまったものにする）
export const KIND_DECISION_STEPS = [
  { kind: 'caution', question: '間違いを防ぐための確認・場合分けを促しているか（〜に注意／〜を確認する）' },
  { kind: 'select', question: '使う公式・手法・手順を決めているか（〜を使う／〜する／〜で求める）' },
  { kind: 'identify', question: '問題の型や分野を名指ししているか（〜の問題）' },
  { kind: 'interpret', question: '上のどれでもなく、書いてあることを言い換えているか（〜だ／〜とわかる）' },
];

export const SOURCES = {
  manual: { label: '手作業' },
  ai: { label: 'AI生成' },
};

export const promptFor = (insight) => KINDS[insight.kind].prompt.replace('{cue}', insight.cue);
