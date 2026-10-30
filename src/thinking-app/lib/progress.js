// 学習の進み具合（React に依存しない純粋な関数。useReducer で使う）
//
// 注目箇所ごとに2つの数を持つ:
//   opened   … 問いかけを出した気づきの数
//   revealed … 答え（考えること）まで出した気づきの数
// 通常は両方が一緒に増える。「考えてから見る」(promptFirst) のときは、
// 1回目の操作で問いかけだけを出し (opened+1)、2回目で答えを出す (revealed+1)。
// 気づきは優先順位の高いものから1個ずつ出る。

export function initProgress(problem) {
  return {
    shown: false, // 見る順番（番号）を表示したか
    activeId: null, // いま開いている注目箇所
    order: problem.focuses.map(f => f.id),
    totals: Object.fromEntries(problem.focuses.map(f => [f.id, f.insights.length])),
    focus: Object.fromEntries(problem.focuses.map(f => [f.id, { opened: 0, revealed: 0 }])),
  };
}

function advance(entry, total, promptFirst) {
  const { opened, revealed } = entry;
  if (opened > revealed) return { opened, revealed: revealed + 1 }; // 出ている問いかけの答えを出す
  if (opened >= total) return entry;
  return promptFirst ? { opened: opened + 1, revealed } : { opened: opened + 1, revealed: revealed + 1 };
}

export function progressReducer(state, action) {
  switch (action.type) {
    case 'show':
      return { ...state, shown: true };

    // 注目箇所を選ぶ。初めて開く箇所なら最初の気づきを出し、開いている箇所をもう一度選ぶと次へ進む
    case 'select': {
      const entry = state.focus[action.id];
      if (!entry) return state;
      const isActive = state.activeId === action.id;
      const nextEntry = isActive || entry.opened === 0
        ? advance(entry, state.totals[action.id], action.promptFirst)
        : entry;
      return { ...state, shown: true, activeId: action.id, focus: { ...state.focus, [action.id]: nextEntry } };
    }

    // 開いている注目箇所で次へ進む（答えを見る／次の気づき）
    case 'advance': {
      if (!state.activeId) return state;
      const entry = state.focus[state.activeId];
      return {
        ...state,
        focus: { ...state.focus, [state.activeId]: advance(entry, state.totals[state.activeId], action.promptFirst) },
      };
    }

    // 「考えてから見る」をやめたときは、出ている問いかけの答えをすべて出す
    case 'revealPending':
      return {
        ...state,
        focus: Object.fromEntries(Object.entries(state.focus).map(([id, e]) => [id, { opened: e.opened, revealed: e.opened }])),
      };

    case 'reset':
      return { ...state, shown: false, activeId: null, focus: Object.fromEntries(state.order.map(id => [id, { opened: 0, revealed: 0 }])) };

    default:
      return state;
  }
}

// 次に見るべき注目箇所（まだ開いていないもののうち優先順位が最も高いもの）
export const nextFocusId = (state) => state.order.find(id => state.focus[id].opened === 0) ?? null;

export const hasPending = (state, id) => state.focus[id].opened > state.focus[id].revealed;

export const revealedTotal = (state) => state.order.reduce((n, id) => n + state.focus[id].revealed, 0);

export const isComplete = (state) => state.order.every(id => state.focus[id].revealed === state.totals[id]);

// いま行うのが自然な「次の操作」（画面のボタンとキー操作で同じものを使う）
//   show     … 見る順番（番号）を表示する
//   advance  … 開いている注目箇所で進める（step: 'answer' 答えを見る / 'more' 次の気づき・問いかけ）
//   select   … 別の注目箇所を開く（step: 'first' 最初 / 'next' 次の注目箇所 / 'continue' 見終わっていない箇所の続き）
//   summary  … すべて見終えたので振り返りへ
export function nextAction(state) {
  if (!state.shown) return { type: 'show' };
  const activeId = state.activeId;
  if (activeId) {
    const { opened, revealed } = state.focus[activeId];
    if (opened > revealed) return { type: 'advance', step: 'answer' };
    if (opened < state.totals[activeId]) return { type: 'advance', step: 'more', remaining: state.totals[activeId] - opened };
  }
  const next = nextFocusId(state);
  if (next) return { type: 'select', id: next, step: activeId ? 'next' : 'first' };
  const unfinished = state.order.find(id => id !== activeId && state.focus[id].revealed < state.totals[id]);
  if (unfinished) return { type: 'select', id: unfinished, step: 'continue' };
  return { type: 'summary' };
}
