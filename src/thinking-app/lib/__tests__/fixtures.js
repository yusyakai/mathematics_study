// テスト用の最小限の問題データ
export const validProblem = () => ({
  schemaVersion: 4,
  id: 'sample_001',
  title: 'テスト問題',
  subject: '数学A',
  unit: '確率',
  difficulty: 'C',
  problem: '赤玉3個、白玉5個から2個取り出すとき、2個とも赤玉である確率を求めよ。',
  focuses: [
    {
      id: 'f2',
      quote: '2個取り出す',
      role: 'situation',
      priority: 2,
      insights: [
        { priority: 2, kind: 'select', cue: '取り出す', thought: 'nCr で数える' },
        { priority: 1, kind: 'interpret', cue: '取り出す', thought: '順番は関係ない' },
      ],
    },
    {
      id: 'f1',
      quote: '確率を求めよ',
      role: 'question',
      priority: 1,
      insights: [{ priority: 1, kind: 'select', cue: '確率', thought: '場合の数の比で求める' }],
    },
  ],
  meta: { source: 'manual', reviewed: true },
});
