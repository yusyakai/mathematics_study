import { currentInsight } from '../../lib/loadThinking.js';
import { ROLES } from '../../lib/catalog.js';
import { focusColor } from '../../lib/colors.js';
import { problemSegments } from '../../lib/model.js';

// 文字表示：問題文の注目箇所をボタンにし、いま見ている気づきの手がかりの語句を強調する
export default function TextStage({ problem, learning }) {
  return (
    <div className="text-stage">
      <div className="problem-sheet">
        <p className="problem-sheet-meta">{[problem.subject, problem.unit].filter(Boolean).join('・')}</p>
        <div className="problem-text">
          <ProblemText problem={problem} learning={learning} />
        </div>
      </div>
    </div>
  );
}

function ProblemText({ problem, learning }) {
  const { state, nextId, select } = learning;
  if (!state.shown) return problem.problem;

  const cueSpan = currentInsight(problem, state)?.cueSpan;
  return problemSegments(problem).map(({ text, index, span }, k) => {
    if (index === undefined) return text;
    const f = problem.focuses[index];
    const isActive = f.id === state.activeId;
    const status = isActive ? 'active' : state.focus[f.id].opened > 0 ? 'opened' : '';
    const inner = isActive && cueSpan
      ? [
          text.slice(0, cueSpan[0] - span[0]),
          <mark key="cue" className="cue-mark">{text.slice(cueSpan[0] - span[0], cueSpan[1] - span[0])}</mark>,
          text.slice(cueSpan[1] - span[0]),
        ]
      : text;
    return (
      <button
        key={k}
        className={`focus-mark ${status} ${f.id === nextId ? 'next' : ''}`}
        style={{ '--focus': focusColor(index) }}
        onClick={() => select(f.id)}
        aria-label={`${index + 1}番 ${ROLES[f.role].label}「${f.quote}」`}
      >
        <span className="focus-num" aria-hidden="true">{index + 1}</span>
        {inner}
      </button>
    );
  });
}
