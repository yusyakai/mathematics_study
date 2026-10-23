import { useEffect, useRef, useState } from 'react';
import { useFocusProgress } from '../../thinking/loadThinking';
import { startAR } from '../../thinking/arScene';
import FocusGuide from './FocusGuide';

// スマホのカメラで問題カードを映し、注目箇所をタップすると気づきが浮かぶ
export default function ThinkingARView({ problem, onBack }) {
  const containerRef = useRef(null);
  const sessionRef = useRef(null);
  const progress = useFocusProgress(problem);
  const { shown, opened, activeId, next, open } = progress;
  const arState = { shown, opened, activeId, nextId: next?.id ?? null };
  const arStateRef = useRef(arState);
  const openRef = useRef(open);
  const [status, setStatus] = useState('準備中…');
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startAR({
      container: containerRef.current,
      problem,
      onStatus: s => !cancelled && setStatus(s),
      onTracking: t => !cancelled && setTracking(t),
      onSelect: id => openRef.current(id),
    }).then(session => {
      if (cancelled) return session.stop();
      sessionRef.current = session;
      session.setState(arStateRef.current);
    }).catch(e => {
      console.error(e);
      if (!cancelled) setError(e ? String(e.message || e) : 'カメラを起動できませんでした。カメラの使用を許可しているか確認してください。');
    });
    return () => {
      cancelled = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [problem]);

  useEffect(() => {
    arStateRef.current = { shown, opened, activeId, nextId: next?.id ?? null };
    openRef.current = open;
    sessionRef.current?.setState(arStateRef.current);
  });

  return (
    <div className="ar-view">
      <div className="ar-container" ref={containerRef} />
      <div className="ar-top">
        <button className="ar-back" onClick={onBack}>← 戻る</button>
        {!status && !error && (
          <span className={`ar-tracking ${tracking ? 'on' : ''}`}>
            {tracking ? 'カードを認識中' : 'カードにカメラを向けてください'}
          </span>
        )}
      </div>
      {(status || error) && (
        <div className="ar-status">
          {error ? <p className="ar-error">{error}</p> : <p>{status}</p>}
        </div>
      )}
      {!status && !error && (
        <div className="ar-bottom">
          <FocusGuide problem={problem} progress={progress} />
        </div>
      )}
    </div>
  );
}
