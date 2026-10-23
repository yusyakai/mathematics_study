import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { thinkingProblems, invalidThinking } from '../../thinking/loadThinking';
import Thinking2DView from './Thinking2DView';
import ThinkingARView from './ThinkingARView';
import ThinkingCardView from './ThinkingCardView';
import './thinking.css';

// 思考プロセス表示（AR試作）の入口。問題一覧と各表示モードを切り替える
export default function ThinkingScreen() {
  const { dispatch } = useApp();
  const [view, setView] = useState({ mode: 'list', problem: null });
  const back = () => setView({ mode: 'list', problem: null });

  if (view.mode === '2d') return <Thinking2DView problem={view.problem} onBack={back} />;
  if (view.mode === 'ar') return <ThinkingARView problem={view.problem} onBack={back} />;
  if (view.mode === 'card') return <ThinkingCardView problem={view.problem} onBack={back} />;

  return (
    <div className="thinking-screen">
      <div className="review-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'home' })}>←</button>
        <h2>思考プロセス（AR試作）</h2>
      </div>

      <p className="thinking-intro">
        問題文のどこに注目し、何に気づき、どの解法を選ぶかを順に表示します。
        ARで見るときは、問題カードを印刷するかPCの画面に表示し、スマホのカメラを向けてください。
      </p>

      <ul className="thinking-list">
        {thinkingProblems.map(p => (
          <li key={p.id} className="thinking-item">
            <div className="thinking-item-head">
              <span className="thinking-item-title">{p.title}</span>
              {p.meta.source === 'ai' && (
                <span className={`thinking-badge ${p.meta.reviewed ? '' : 'warn'}`}>
                  {p.meta.reviewed ? 'AI生成' : 'AI生成・未確認'}
                </span>
              )}
            </div>
            <div className="thinking-item-sub">{[p.subject, p.unit].filter(Boolean).join('｜')}</div>
            <div className="thinking-item-actions">
              <button onClick={() => setView({ mode: '2d', problem: p })}>画面で見る</button>
              <button className="primary" onClick={() => setView({ mode: 'ar', problem: p })}>ARで見る</button>
              <button onClick={() => setView({ mode: 'card', problem: p })}>カード</button>
            </div>
          </li>
        ))}
      </ul>

      {invalidThinking.length > 0 && (
        <details className="thinking-invalid">
          <summary>読み込めなかったデータ {invalidThinking.length} 件</summary>
          {invalidThinking.map(f => (
            <div key={f.file}>
              <strong>{f.file}</strong>
              <ul>{f.errors.map(e => <li key={e}>{e}</li>)}</ul>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
