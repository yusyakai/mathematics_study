import { useEffect, useRef, useState } from 'react';
import { useLearning, currentInsight } from '../lib/loadThinking.js';
import { startAR } from '../lib/arScene.js';
import FocusGuide from './FocusGuide.jsx';

// AR を始められなかったときの案内（ARError の code ごと）
const AR_ERRORS = {
  insecure: 'カメラを使うには https:// で始まるページで開いてください。',
  unsupported: 'このブラウザはカメラに対応していません。iPhone は Safari、Android は Chrome の最新版で開いてください。',
  load: 'ARの部品を読み込めませんでした。通信状況を確認して、もう一度お試しください。',
  camera: 'カメラを起動できませんでした。ブラウザの設定でこのページのカメラの使用を許可しているか確認してください。',
};
const RETRYABLE = ['load', 'camera'];

// スマホのカメラで問題カードを映し、注目箇所をタップするたびに気づきが1個ずつ浮かぶ
export default function ThinkingARView({ problem, onBack, onFallback, onSummary }) {
  const containerRef = useRef(null);
  const sessionRef = useRef(null);
  const learning = useLearning(problem);
  const [status, setStatus] = useState('準備中…');
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const { state, nextId, select } = learning;
  const view = { shown: state.shown, activeId: state.activeId, nextId, focus: state.focus, cueSpan: currentInsight(problem, state)?.cueSpan ?? null };
  const viewRef = useRef(view);
  const selectRef = useRef(select);

  useEffect(() => {
    const controller = new AbortController();
    const alive = () => !controller.signal.aborted;
    startAR({
      container: containerRef.current,
      problem,
      signal: controller.signal,
      onStatus: s => alive() && setStatus(s),
      onTracking: t => alive() && setTracking(t),
      onSelect: id => selectRef.current(id),
    }).then(session => {
      if (!alive()) return session.stop();
      sessionRef.current = session;
      session.setView(viewRef.current);
    }).catch(e => {
      if (!alive() || e?.code === 'aborted') return;
      console.warn('AR を開始できませんでした', e);
      setError(AR_ERRORS[e?.code] ? e.code : 'camera');
    });
    return () => {
      controller.abort();
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [problem, attempt]);

  useEffect(() => {
    viewRef.current = view;
    selectRef.current = select;
    sessionRef.current?.setView(view);
  });

  const retry = () => {
    setError(null);
    setStatus('準備中…');
    setAttempt(a => a + 1);
  };
  const ready = !status && !error;

  return (
    <div className="ar-view">
      <div className="ar-container" ref={containerRef} />
      <div className="ar-top">
        <button className="ar-back" onClick={onBack}>← 戻る</button>
        {ready && (
          <span className={`ar-tracking ${tracking ? 'on' : ''}`} role="status">
            {tracking ? 'カードを認識中' : 'カード全体が映るように向けてください'}
          </span>
        )}
      </div>
      {!ready && (
        <div className="ar-status">
          {error ? (
            <div className="ar-error-box" role="alert">
              <p>{AR_ERRORS[error]}</p>
              <div className="focus-actions">
                {RETRYABLE.includes(error) && <button onClick={retry}>もう一度試す</button>}
                <button className="primary" onClick={onFallback}>画面で見る</button>
              </div>
            </div>
          ) : (
            <p role="status">{status}</p>
          )}
        </div>
      )}
      {ready && (
        <div className="ar-bottom">
          <FocusGuide problem={problem} learning={learning} onSummary={onSummary} />
        </div>
      )}
    </div>
  );
}
