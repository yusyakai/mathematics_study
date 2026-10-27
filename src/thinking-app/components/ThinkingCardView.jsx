import { useEffect, useState } from 'react';
import { prepareCard } from '../lib/canvasRender.js';

// AR の認識対象になる問題カード。印刷するか、PC の画面に表示してスマホを向ける
export default function ThinkingCardView({ problem, onBack }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    prepareCard(problem).then(card => {
      if (!cancelled) setSrc(card.canvas.toDataURL('image/png'));
    });
    return () => { cancelled = true; };
  }, [problem]);

  return (
    <div className="thinking-screen card-view">
      <header className="app-header">
        <button className="back-btn" onClick={onBack} aria-label="戻る">←</button>
        <h2>問題カード：{problem.title}</h2>
      </header>
      {src ? <img className="thinking-card-img" src={src} alt={`問題カード：${problem.problem}`} /> : <p className="thinking-intro" role="status">カードを作成中…</p>}
      <p className="thinking-intro">
        このカードを PC の画面に大きく表示するか印刷し、スマホで同じ問題の「ARで見る」を開いてカメラを向けてください。
        別の問題のカードは認識しません。
      </p>
      {src && (
        <div className="thinking-item-actions card-actions">
          <a className="button-link" href={src} download={`card_${problem.id}.png`}>画像を保存</a>
          <button onClick={() => window.print()}>印刷</button>
        </div>
      )}
    </div>
  );
}
