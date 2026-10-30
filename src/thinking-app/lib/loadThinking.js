// src/thinking-app/data/*.json を読み込み、検証を通ったものだけを使う
// ファイルを置くだけで追加される（AIが生成したファイルも同じ）
import { useEffect, useReducer } from 'react';
import { validateThinking } from './schema.js';
import { normalizeProblem } from './model.js';
import { initProgress, progressReducer, nextFocusId, isComplete } from './progress.js';
import { useStoredState, writeStore, readStore, STORE_KEYS } from './storage.js';

const modules = import.meta.glob('../data/*.json', { eager: true, import: 'default' });

export const thinkingProblems = [];
export const invalidThinking = []; // { file, errors }

for (const [path, data] of Object.entries(modules)) {
  const file = path.split('/').pop();
  const { errors } = validateThinking(data);
  if (data?.id && file !== `${data.id}.json`) errors.push(`ファイル名を「${data.id}.json」にしてください`);
  if (errors.length) invalidThinking.push({ file, errors });
  else thinkingProblems.push(normalizeProblem(data));
}

thinkingProblems.sort((a, b) => a.id.localeCompare(b.id));

// 1問を学習するときの状態と操作
export function useLearning(problem) {
  const [settings, setSettings] = useStoredState(STORE_KEYS.settings, { promptFirst: false });
  const [state, dispatch] = useReducer(progressReducer, problem, initProgress);
  const promptFirst = Boolean(settings.promptFirst);
  const complete = isComplete(state);

  // すべての気づきを見たら完了として記録する（下書きは記録しない）
  useEffect(() => {
    if (complete && !problem.draft) {
      writeStore(STORE_KEYS.completed, { ...readStore(STORE_KEYS.completed, {}), [problem.id]: new Date().toISOString() });
    }
  }, [complete, problem]);

  return {
    state,
    promptFirst,
    complete,
    nextId: nextFocusId(state),
    show: () => dispatch({ type: 'show' }),
    select: (id) => dispatch({ type: 'select', id, promptFirst }),
    advance: () => dispatch({ type: 'advance', promptFirst }),
    reset: () => dispatch({ type: 'reset' }),
    setPromptFirst: (value) => {
      setSettings(s => ({ ...s, promptFirst: value }));
      if (!value) dispatch({ type: 'revealPending' });
    },
  };
}

// いま強調する気づき（問いかけ中ならその気づき、そうでなければ最後に出した気づき）
export function currentInsight(problem, state) {
  const focus = problem.focuses.find(f => f.id === state.activeId);
  if (!focus) return null;
  const { opened, revealed } = state.focus[focus.id];
  const index = opened > revealed ? revealed : revealed - 1;
  return focus.insights[index] ?? null;
}
