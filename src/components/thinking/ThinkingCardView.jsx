import { useEffect, useState } from 'react';
import { prepareCard } from '../../thinking/arScene';

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
      <div className="review-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>問題カード</h2>
      </div>
      {src ? <img className="thinking-card-img" src={src} alt={problem.problem} /> : <p>カードを作成中…</p>}
      <p className="thinking-intro">
        このカードを PC の画面に大きく表示するか印刷し、スマホで「カメラで見る」を開いて向けてください。
      </p>
      {src && (
        <div className="thinking-item-actions">
          <a className="button-link" href={src} download={`card_${problem.id}.png`}>画像を保存</a>
          <button onClick={() => window.print()}>印刷</button>
        </div>
      )}
    </div>
  );
}
