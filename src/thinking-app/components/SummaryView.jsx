import { KINDS, ROLES } from '../lib/catalog.js';
import { focusColor, KIND_COLORS } from '../lib/colors.js';

// 振り返り: すべての注目箇所と気づきを、見る順番どおりに一覧にする
export default function SummaryView({ problem, onBack, onRetry }) {
  const kindCounts = Object.keys(KINDS)
    .map(kind => ({ kind, count: problem.focuses.reduce((n, f) => n + f.insights.filter(s => s.kind === kind).length, 0) }))
    .filter(k => k.count > 0);

  return (
    <div className="thinking-screen">
      <header className="app-header">
        <button className="back-btn" onClick={onBack} aria-label="戻る">←</button>
        <h2>振り返り：{problem.title}</h2>
      </header>

      <div className="thinking-problem summary-problem">{problem.problem}</div>

      <p className="summary-kinds">
        {kindCounts.map(({ kind, count }) => (
          <span key={kind} className="kind-chip" style={{ '--kind': KIND_COLORS[kind] }}>{KINDS[kind].label} {count}</span>
        ))}
      </p>

      <ol className="summary-list">
        {problem.focuses.map((f, i) => (
          <li key={f.id} className="summary-focus">
            <div className="insight-quote">
              <span className="focus-num" style={{ '--focus': focusColor(i) }}>{i + 1}</span>
              <span className="role-chip">{ROLES[f.role].label}</span>
              <span>「{f.quote}」</span>
            </div>
            <ul className="summary-insights">
              {f.insights.map(s => (
                <li key={s.priority} className="insight">
                  <div className="insight-cue">
                    <span className="kind-chip" style={{ '--kind': KIND_COLORS[s.kind] }}>{KINDS[s.kind].label}</span>
                    「{s.cue}」と書いてある
                  </div>
                  <div className="insight-thought">→ {s.thought}</div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="focus-actions summary-actions">
        <button onClick={onRetry}>もう一度取り組む</button>
        <button className="primary" onClick={onBack}>戻る</button>
      </div>
    </div>
  );
}
