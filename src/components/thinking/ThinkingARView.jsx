import { useEffect, useRef, useState } from 'react';
import { buildSteps, visibleAt } from '../../thinking/loadThinking';
import { startAR } from '../../thinking/arScene';
import StepControls from './StepControls';

// スマホのカメラで問題カードを映し、注目箇所と思考ノードを重ねる
export default function ThinkingARView({ problem, onBack }) {
  const containerRef = useRef(null);
  const sessionRef = useRef(null);
  const steps = buildSteps(problem);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('準備中…');
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(false);
  const stepRef = useRef(step);

  useEffect(() => {
    let cancelled = false;
    startAR({
      container: containerRef.current,
      problem,
      onStatus: s => !cancelled && setStatus(s),
      onTracking: t => !cancelled && setTracking(t),
    }).then(session => {
      if (cancelled) return session.stop();
      sessionRef.current = session;
      session.setVisible(visibleAt(problem, stepRef.current));
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
    stepRef.current = step;
    sessionRef.current?.setVisible(visibleAt(problem, step));
  }, [problem, step]);

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
          <StepControls problem={problem} steps={steps} step={step} setStep={setStep} />
        </div>
      )}
    </div>
  );
}
