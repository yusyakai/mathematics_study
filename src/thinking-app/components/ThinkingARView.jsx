import { useEffect, useRef, useState } from 'react';
import { useFocusProgress } from '../lib/loadThinking';
import { startAR } from '../lib/arScene';
import FocusGuide from './FocusGuide';

// スマホのカメラで問題カードを映し、注目箇所をタップするたびに気づきが1個ずつ浮かぶ
export default function ThinkingARView({ problem, onBack }) {
  const containerRef = useRef(null);
  const sessionRef = useRef(null);
  const progress = useFocusProgress(problem);
  const { shown, revealed, activeId, next, select } = progress;
  const arState = { shown, revealed, activeId, nextId: next?.id ?? null };
  const arStateRef = useRef(arState);
  const selectRef = useRef(select);
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
      onSelect: id => selectRef.current(id),
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
    arStateRef.current = { shown, revealed, activeId, nextId: next?.id ?? null };
    selectRef.current = select;
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
