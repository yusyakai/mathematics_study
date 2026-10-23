// src/thinking-app/data/*.json を読み込み、検証を通ったものだけを使う
// ファイルを置くだけで追加される（AIが生成したファイルも同じ）
// 読み込み時に優先順位で並べ替えるので、以降は配列の順番 = 優先順位として扱う
import { useState } from 'react';
import { validateThinking, locateQuote } from './schema';

const modules = import.meta.glob('../data/*.json', { eager: true, import: 'default' });

export const thinkingProblems = [];
export const invalidThinking = []; // { file, errors }

const byPriority = (a, b) => a.priority - b.priority;

for (const [path, data] of Object.entries(modules)) {
  const errors = validateThinking(data);
  if (errors.length) {
    invalidThinking.push({ file: path.split('/').pop(), errors });
    continue;
  }
  thinkingProblems.push({
    ...data,
    focuses: [...data.focuses].sort(byPriority).map(f => ({
      ...f,
      span: locateQuote(data.problem, f.quote, f.occurrence ?? 1),
      insights: [...f.insights].sort(byPriority),
    })),
  });
}

thinkingProblems.sort((a, b) => a.id.localeCompare(b.id));

export const FOCUS_COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#ef4444'];
export const focusColor = (index) => FOCUS_COLORS[index % FOCUS_COLORS.length];

// 学習の進み具合
//   shown    : 注目箇所の番号を表示したか
//   revealed : 注目箇所ID → 表示済みの気づきの数（優先順位の高いものから1個ずつ増える）
//   activeId : いま開いている注目箇所
export function useFocusProgress(problem) {
  const [shown, setShown] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [activeId, setActiveId] = useState(null);

  const countOf = (id) => revealed[id] ?? 0;
  const totalOf = (id) => problem.focuses.find(f => f.id === id)?.insights.length ?? 0;

  // 注目箇所を開く。すでに開いている箇所なら次の気づきを1個表示する
  const select = (id) => {
    setShown(true);
    setActiveId(id);
    const count = countOf(id);
    if (count === 0 || (id === activeId && count < totalOf(id))) {
      setRevealed(prev => ({ ...prev, [id]: count + 1 }));
    }
  };
  const revealNext = () => {
    if (activeId && countOf(activeId) < totalOf(activeId)) {
      setRevealed(prev => ({ ...prev, [activeId]: countOf(activeId) + 1 }));
    }
  };
  const reset = () => {
    setShown(false);
    setRevealed({});
    setActiveId(null);
  };
  const next = problem.focuses.find(f => countOf(f.id) === 0) ?? null;

  return { shown, show: () => setShown(true), revealed, countOf, activeId, select, revealNext, reset, next };
}
