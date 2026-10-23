import { useState } from 'react';
import { buildSteps, visibleAt, TRIGGER_COLORS } from '../../thinking/loadThinking';
import { STAGES } from '../../thinking/schema';
import StepControls from './StepControls';

// カメラを使わない表示。ARと同じ段階で、問題文のハイライトと思考ノードを並べる
export default function Thinking2DView({ problem, onBack }) {
  const steps = buildSteps(problem);
  const [step, setStep] = useState(0);
  const visible = visibleAt(problem, step);

  return (
    <div className="thinking-screen">
      <div className="review-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>{problem.title}</h2>
      </div>

      <div className="thinking-problem">
        <HighlightedProblem problem={problem} active={visible.triggers} />
      </div>

      <div className="thinking-stages">
        {Object.entries(STAGES).map(([key, stage]) => {
          const nodes = problem.thoughts.filter(n => n.stage === key && visible.thoughtIds.has(n.id));
          if (nodes.length === 0) return null;
          return (
            <section key={key}>
              <h3>{stage.label}</h3>
              {nodes.map(n => (
                <div key={n.id} className={`thought-node ${n.adopted === false ? 'rejected' : ''} ${n.adopted ? 'adopted' : ''}`}>
                  <div className="thought-from">
                    {n.from.map(ref => <RefChip key={ref} problem={problem} id={ref} />)}
                  </div>
                  <div className="thought-text">{n.text}</div>
                  {n.stage === 'strategy' && (
                    <div className="thought-sub">{n.adopted ? '✓ 採用' : `✕ 不採用: ${n.reason}`}</div>
                  )}
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <StepControls problem={problem} steps={steps} step={step} setStep={setStep} />
    </div>
  );
}

function HighlightedProblem({ problem, active }) {
  if (!active) return problem.problem;
  const parts = [];
  let pos = 0;
  const ordered = problem.triggers
    .map((t, i) => ({ ...t, color: TRIGGER_COLORS[i % TRIGGER_COLORS.length], num: i + 1 }))
    .sort((a, b) => a.span[0] - b.span[0]);
  for (const t of ordered) {
    if (t.span[0] < pos) continue; // 重なる指定は先のものを優先
    parts.push(problem.problem.slice(pos, t.span[0]));
    parts.push(
      <mark key={t.id} style={{ '--mark': t.color }}>
        <sup>{t.num}</sup>{problem.problem.slice(t.span[0], t.span[1])}
      </mark>
    );
    pos = t.span[1];
  }
  parts.push(problem.problem.slice(pos));
  return parts;
}

function RefChip({ problem, id }) {
  const ti = problem.triggers.findIndex(t => t.id === id);
  if (ti >= 0) {
    return <span className="ref-chip" style={{ background: TRIGGER_COLORS[ti % TRIGGER_COLORS.length] }}>{ti + 1}</span>;
  }
  const n = problem.thoughts.find(x => x.id === id);
  return <span className="ref-chip node">← {n.text.length > 12 ? n.text.slice(0, 12) + '…' : n.text}</span>;
}
