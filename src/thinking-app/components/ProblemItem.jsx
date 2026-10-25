import { DIFFICULTIES } from '../lib/catalog.js';
import { insightTotal } from '../lib/model.js';

// 一覧の1問分。onOpen({ mode, problem }) で各画面を開く
export default function ProblemItem({ problem, completedAt, onOpen, children }) {
  const date = completedAt ? new Date(completedAt) : null;
  return (
    <li className="thinking-item">
      <div className="thinking-item-head">
        <span className="thinking-item-title">{problem.title}</span>
        {problem.meta.source === 'ai' && <span className="thinking-badge">AI生成</span>}
        {!problem.meta.reviewed && <span className="thinking-badge warn">未確認</span>}
        {date && <span className="thinking-badge done">✓ {date.getMonth() + 1}/{date.getDate()} 完了</span>}
      </div>
      <div className="thinking-item-sub">
        {[problem.subject, problem.unit, DIFFICULTIES[problem.difficulty]?.label].filter(Boolean).join('｜')}
        <span className="thinking-item-count">注目箇所 {problem.focuses.length}・気づき {insightTotal(problem)}</span>
      </div>
      <div className="thinking-item-actions">
        <button onClick={() => onOpen({ mode: '2d', problem })}>画面で見る</button>
        <button className="primary" onClick={() => onOpen({ mode: 'ar', problem })}>ARで見る</button>
        <button onClick={() => onOpen({ mode: 'card', problem })}>カード</button>
      </div>
      {children}
    </li>
  );
}
