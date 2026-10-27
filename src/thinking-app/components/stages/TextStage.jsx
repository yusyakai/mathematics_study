import { currentInsight } from '../../lib/loadThinking.js';
import { ROLES } from '../../lib/catalog.js';
import { focusColor } from '../../lib/colors.js';

// 文字表示：問題文の注目箇所をボタンにし、いま見ている気づきの手がかりの語句を強調する
export default function TextStage({ problem, learning }) {
  return (
    <div className="text-stage">
      <div className="thinking-problem">
        <ProblemText problem={problem} learning={learning} />
      </div>
    </div>
  );
}

function ProblemText({ problem, learning }) {
  const { state, nextId, select } = learning;
  const text = problem.problem;
  if (!state.shown) return text;

  const cueSpan = currentInsight(problem, state)?.cueSpan;
  const parts = [];
  let pos = 0;
  const ordered = problem.focuses.map((f, i) => ({ f, i })).sort((a, b) => a.f.span[0] - b.f.span[0]);
  for (const { f, i } of ordered) {
    parts.push(text.slice(pos, f.span[0]));
    const isActive = f.id === state.activeId;
    const status = isActive ? 'active' : state.focus[f.id].opened > 0 ? 'opened' : '';
    const inner = isActive && cueSpan
      ? [
          text.slice(f.span[0], cueSpan[0]),
          <mark key="cue" className="cue-mark">{text.slice(cueSpan[0], cueSpan[1])}</mark>,
          text.slice(cueSpan[1], f.span[1]),
        ]
      : text.slice(f.span[0], f.span[1]);
    parts.push(
      <button
        key={f.id}
        className={`focus-mark ${status} ${f.id === nextId ? 'next' : ''}`}
        style={{ '--focus': focusColor(i) }}
        onClick={() => select(f.id)}
        aria-label={`${i + 1}番 ${ROLES[f.role].label}「${f.quote}」`}
      >
        <span className="focus-num" aria-hidden="true">{i + 1}</span>
        {inner}
      </button>
    );
    pos = f.span[1];
  }
  parts.push(text.slice(pos));
  return parts;
}
