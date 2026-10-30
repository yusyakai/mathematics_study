import { useEffect, useState } from 'react';
import { prepareCard } from '../lib/canvasRender.js';
import Icon from './Icon.jsx';

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
    <div className="screen card-view">
      <header className="app-bar">
        <div className="app-bar-inner">
          <button className="icon-btn" onClick={onBack} aria-label="戻る"><Icon name="back" size={20} /></button>
          <div className="app-bar-title">
            <h2>問題カード</h2>
            <p>{problem.title}</p>
          </div>
        </div>
      </header>
      <main className="page">
        <div className="card-frame">
          {src
            ? <img className="thinking-card-img" src={src} alt={`問題カード：${problem.problem}`} />
            : <p className="stage-loading" role="status"><span className="spinner" aria-hidden="true" />カードを作成中…</p>}
        </div>
        {src && (
          <div className="btn-row card-actions">
            <a className="btn" href={src} download={`card_${problem.id}.png`}><Icon name="download" size={16} />画像を保存</a>
            <button className="btn" onClick={() => window.print()}><Icon name="printer" size={16} />印刷</button>
          </div>
        )}
        <section className="panel card-howto">
          <h3 className="panel-title"><Icon name="camera" size={18} />ARで見るには</h3>
          <ol className="steps">
            <li>このカードを PC の画面に大きく表示するか、印刷する</li>
            <li>スマホで同じ問題の「ARで見る」を開く</li>
            <li>カード全体が映るようにカメラを向ける（別の問題のカードは認識しません）</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
