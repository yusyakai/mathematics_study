// src/data/thinking/*.json を読み込み、検証を通ったものだけを使う
// ファイルを置くだけで追加される（AIが生成したファイルも同じ）
import { validateThinking, locateQuote, STAGES } from './schema';

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
    triggers: data.triggers.map(t => ({
      ...t,
      span: locateQuote(data.problem, t.quote, t.occurrence ?? 1),
    })),
  });
}

thinkingProblems.sort((a, b) => a.id.localeCompare(b.id));

// 表示の段階: 問題文 → 注目ポイント → 思考ノードを1つずつ
export function buildSteps(problem) {
  return [
    { kind: 'problem', caption: '問題文を読もう。どこが解法の手がかりになる？' },
    { kind: 'triggers', caption: '注目ポイント' },
    ...problem.thoughts.map(n => ({
      kind: 'thought',
      id: n.id,
      caption: `${STAGES[n.stage].label}: ${n.text}`,
      note: n.adopted === false ? `不採用の理由: ${n.reason}` : null,
    })),
  ];
}

export function visibleAt(problem, stepIndex) {
  return {
    triggers: stepIndex >= 1,
    thoughtIds: new Set(problem.thoughts.slice(0, Math.max(0, stepIndex - 1)).map(n => n.id)),
  };
}

export const TRIGGER_COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6'];
