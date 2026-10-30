import { KINDS } from '../lib/catalog.js';
import { focusColor, KIND_COLORS } from '../lib/colors.js';
import { insightTotal, problemSegments } from '../lib/model.js';
import { FocusHead, InsightCard } from './InsightCard.jsx';
import Icon from './Icon.jsx';

// 振り返り: すべての注目箇所と気づきを、見る順番どおりに一覧にする
//   next: 次に勧める問題（なければ null）
export default function SummaryView({ problem, next, onBack, onRetry, onNext }) {
  const total = insightTotal(problem);
  const kindCounts = Object.keys(KINDS)
    .map(kind => ({ kind, count: problem.focuses.reduce((n, f) => n + f.insights.filter(s => s.kind === kind).length, 0) }))
    .filter(k => k.count > 0);

  return (
    <div className="screen summary-view">
      <header className="app-bar">
        <div className="app-bar-inner">
          <button className="icon-btn" onClick={onBack} aria-label="戻る"><Icon name="back" size={20} /></button>
          <div className="app-bar-title">
            <h2>振り返り</h2>
            <p>{problem.title}</p>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="summary-hero">
          <span className="summary-hero-icon"><Icon name="check" size={26} /></span>
          <div>
            <p className="summary-hero-title">おつかれさまでした</p>
            <p className="summary-hero-text">注目箇所 {problem.focuses.length} か所・気づき {total} 個をすべて見ました。</p>
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title">問題文と見る順番</h3>
          <p className="problem-text summary-problem">
            {problemSegments(problem).map(({ text, index }, k) => (index === undefined ? text : (
              <span key={k} className="focus-mark static" style={{ '--focus': focusColor(index) }}>
                <span className="focus-num" aria-hidden="true">{index + 1}</span>{text}
              </span>
            )))}
          </p>
          <h3 className="panel-title">気づきの種類</h3>
          <div className="kind-bar" aria-hidden="true">
            {kindCounts.map(({ kind, count }) => (
              <span key={kind} style={{ flexGrow: count, '--kind': KIND_COLORS[kind] }} />
            ))}
          </div>
          <ul className="kind-legend">
            {kindCounts.map(({ kind, count }) => (
              <li key={kind} style={{ '--kind': KIND_COLORS[kind] }}>{KINDS[kind].label}<strong>{count}</strong></li>
            ))}
          </ul>
        </section>

        <ol className="timeline">
          {problem.focuses.map((f, i) => (
            <li key={f.id} className="timeline-item summary-focus" style={{ '--focus': focusColor(i) }}>
              <FocusHead focus={f} index={i} />
              <ul className="insight-list">
                {f.insights.map(s => <InsightCard key={s.priority} insight={s} />)}
              </ul>
            </li>
          ))}
        </ol>
      </main>

      <footer className="action-bar">
        <div className="action-bar-inner">
          <button className="btn" onClick={onRetry}><Icon name="refresh" size={16} />もう一度</button>
          {next ? (
            <button className="btn primary" onClick={onNext}>次の問題へ<Icon name="arrowRight" size={16} /></button>
          ) : (
            <button className="btn primary" onClick={onBack}>一覧に戻る</button>
          )}
        </div>
      </footer>
    </div>
  );
}
