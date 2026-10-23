import { useFocusProgress, focusColor } from '../../thinking/loadThinking';
import FocusGuide from './FocusGuide';

// カメラを使わない表示。問題文の注目箇所をタップすると気づきが出る
export default function Thinking2DView({ problem, onBack }) {
  const progress = useFocusProgress(problem);

  return (
    <div className="thinking-screen">
      <div className="review-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>{problem.title}</h2>
      </div>

      <div className="thinking-problem">
        <ProblemText problem={problem} progress={progress} />
      </div>

      <FocusGuide problem={problem} progress={progress} />
    </div>
  );
}

function ProblemText({ problem, progress }) {
  if (!progress.shown) return problem.problem;
  const parts = [];
  let pos = 0;
  const ordered = problem.focuses
    .map((f, i) => ({ ...f, index: i }))
    .sort((a, b) => a.span[0] - b.span[0]);
  for (const f of ordered) {
    parts.push(problem.problem.slice(pos, f.span[0]));
    const state = f.id === progress.activeId ? 'active' : (progress.opened.has(f.id) ? 'opened' : '');
    parts.push(
      <button
        key={f.id}
        className={`focus-mark ${state} ${f.id === progress.next?.id ? 'next' : ''}`}
        style={{ '--focus': focusColor(f.index) }}
        onClick={() => progress.open(f.id)}
      >
        <span className="focus-num">{f.index + 1}</span>
        {problem.problem.slice(f.span[0], f.span[1])}
      </button>
    );
    pos = f.span[1];
  }
  parts.push(problem.problem.slice(pos));
  return parts;
}
