// 検証済みのデータを、画面で使う形に整える（React・Vite に依存しない純粋な関数）
//   ・注目箇所と気づきを優先順位順に並べる（以降は配列の順番 = 優先順位 = 表示する番号）
//   ・引用から問題文中の位置を求める（span: 注目箇所、cueSpan: 手がかりの語句）
import { locateQuote } from './schema.js';

const byPriority = (a, b) => a.priority - b.priority;

export function normalizeProblem(data) {
  return {
    ...data,
    focuses: [...data.focuses].sort(byPriority).map(f => {
      const span = locateQuote(data.problem, f.quote, f.occurrence ?? 1);
      return {
        ...f,
        span,
        insights: [...f.insights].sort(byPriority).map(s => ({
          ...s,
          cueSpan: locateQuote(data.problem, s.cue, 1, span[0], span[1]),
        })),
      };
    }),
  };
}

// 気づきの総数
export const insightTotal = (problem) => problem.focuses.reduce((n, f) => n + f.insights.length, 0);
