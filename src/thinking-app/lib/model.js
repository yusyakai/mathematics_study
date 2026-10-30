// 検証済みのデータを、画面で使う形に整える（React・Vite に依存しない純粋な関数）
//   ・注目箇所と気づきを優先順位順に並べる（以降は配列の順番 = 優先順位 = 表示する番号）
//   ・引用から問題文中の位置を求める（span: 注目箇所、cueSpan: 手がかりの語句）
import { locateQuote } from './schema.js';
import { SUBJECTS, DIFFICULTIES } from './catalog.js';

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

// 問題文を、注目箇所とそれ以外の部分に分ける（文字表示・振り返りで使う）
//   戻り値: [{ text, index?, span? }]（index は注目箇所の番号（0から）。注目箇所でない部分には付けない）
export function problemSegments(problem) {
  const text = problem.problem;
  const ordered = problem.focuses.map((f, index) => ({ f, index })).sort((a, b) => a.f.span[0] - b.f.span[0]);
  const segments = [];
  let pos = 0;
  for (const { f, index } of ordered) {
    if (f.span[0] > pos) segments.push({ text: text.slice(pos, f.span[0]) });
    segments.push({ text: text.slice(f.span[0], f.span[1]), index, span: f.span });
    pos = f.span[1];
  }
  if (pos < text.length) segments.push({ text: text.slice(pos) });
  return segments;
}

// 一覧の並び。科目・単元は catalog.js の順、同じ単元の中は難易度（C → S）・ID の順
export function sortProblems(problems) {
  const subjects = Object.keys(SUBJECTS);
  const difficulties = Object.keys(DIFFICULTIES);
  const order = (i) => (i === -1 ? Infinity : i);
  const rank = (p) => [
    order(subjects.indexOf(p.subject)),
    order(SUBJECTS[p.subject]?.indexOf(p.unit) ?? -1),
    order(difficulties.indexOf(p.difficulty)),
  ];
  return [...problems].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    const i = ra.findIndex((v, k) => v !== rb[k]);
    return i === -1 ? a.id.localeCompare(b.id) : ra[i] - rb[i];
  });
}

// 振り返りの後に勧める次の問題。一覧でこの問題より後にある、まだ完了していない問題（最後まで行ったら先頭に戻る）。
// すべて完了しているときは一覧の次の問題。ほかに問題がなければ null
export function nextProblem(problems, currentId, completed = {}) {
  const i = problems.findIndex(p => p.id === currentId);
  if (i === -1 || problems.length < 2) return null;
  const rest = [...problems.slice(i + 1), ...problems.slice(0, i)];
  return rest.find(p => !completed[p.id]) ?? rest[0];
}
