import { DIFFICULTIES } from '../lib/catalog.js';
import { DIFFICULTY_COLORS } from '../lib/colors.js';
import { insightTotal } from '../lib/model.js';
import Icon from './Icon.jsx';

// 一覧の1問分。カードのどこを押しても「画面で見る」で開く。onOpen({ mode, problem }) で各画面を開く
//   children: カードの下に添える内容（作成ツールの下書きの操作など）
export default function ProblemItem({ problem, completedAt, onOpen, children }) {
  const date = completedAt ? new Date(completedAt) : null;
  const difficulty = DIFFICULTIES[problem.difficulty];
  return (
    <li className={`problem-card ${date ? 'is-done' : ''}`} style={{ '--difficulty': DIFFICULTY_COLORS[problem.difficulty] }}>
      <div className="problem-card-top">
        <span className="problem-unit">{problem.unit}</span>
        {difficulty && <span className="difficulty-tag">{difficulty.label}</span>}
        {problem.meta.source === 'ai' && <span className="tag">AI生成</span>}
        {!problem.meta.reviewed && <span className="tag warn">未確認</span>}
        {date && (
          <span className="tag ok">
            <Icon name="check" size={12} />{date.getMonth() + 1}/{date.getDate()} 完了
          </span>
        )}
        <span className="problem-stats">注目箇所 {problem.focuses.length}・気づき {insightTotal(problem)}</span>
      </div>
      <h3 className="problem-title">
        <button className="stretched" onClick={() => onOpen({ mode: 'learn', problem })} aria-label={`${problem.title}を画面で見る`}>
          {problem.title}
        </button>
      </h3>
      <p className="problem-preview">{problem.problem}</p>
      <div className="problem-card-bottom">
        <span className="problem-actions">
          <button className="btn ghost sm" onClick={() => onOpen({ mode: 'learn', problem, display: 'camera' })}>
            <Icon name="camera" size={16} />ARで見る
          </button>
          <button className="btn ghost sm" onClick={() => onOpen({ mode: 'card', problem })}>
            <Icon name="card" size={16} />カード
          </button>
        </span>
        <span className="problem-go" aria-hidden="true">画面で見る<Icon name="chevronRight" size={16} /></span>
      </div>
      {children}
    </li>
  );
}
