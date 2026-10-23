// src/data/thinking/*.json を読み込み、検証を通ったものだけを使う
// ファイルを置くだけで追加される（AIが生成したファイルも同じ）
import { useState } from 'react';
import { validateThinking, locateQuote } from './schema';

const modules = import.meta.glob('../data/thinking/*.json', { eager: true, import: 'default' });

export const thinkingProblems = [];
export const invalidThinking = []; // { file, errors }

for (const [path, data] of Object.entries(modules)) {
  const errors = validateThinking(data);
  if (errors.length) {
    invalidThinking.push({ file: path.split('/').pop(), errors });
    continue;
  }
  thinkingProblems.push({
    ...data,
    focuses: data.focuses.map(f => ({
      ...f,
      span: locateQuote(data.problem, f.quote, f.occurrence ?? 1),
    })),
  });
}

thinkingProblems.sort((a, b) => a.id.localeCompare(b.id));

export const FOCUS_COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#ef4444'];
export const focusColor = (index) => FOCUS_COLORS[index % FOCUS_COLORS.length];

// 学習の進み具合: 注目箇所を表示したか、どこを開いたか、いま開いている箇所
export function useFocusProgress(problem) {
  const [shown, setShown] = useState(false);
  const [opened, setOpened] = useState(() => new Set());
  const [activeId, setActiveId] = useState(null);

  const open = (id) => {
    setShown(true);
    setActiveId(id);
    setOpened(prev => new Set(prev).add(id));
  };
  const reset = () => {
    setShown(false);
    setOpened(new Set());
    setActiveId(null);
  };
  const next = problem.focuses.find(f => !opened.has(f.id)) ?? null;

  return { shown, show: () => setShown(true), opened, activeId, open, reset, next };
}
