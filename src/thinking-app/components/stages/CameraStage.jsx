import { useEffect, useRef, useState } from 'react';
import { startCamera } from '../../lib/hosts/cameraHost.js';

// カメラを始められなかったときの案内（StageError の code ごと）
const ERRORS = {
  insecure: 'カメラを使うには https:// で始まるページで開いてください。',
  unsupported: 'このブラウザはカメラに対応していません。iPhone は Safari、Android は Chrome の最新版で開いてください。',
  load: 'ARの部品を読み込めませんでした。通信状況を確認して、もう一度お試しください。',
  camera: 'カメラを起動できませんでした。ブラウザの設定でこのページのカメラの使用を許可しているか確認してください。',
};
const RETRYABLE = ['load', 'camera'];

// カメラ表示：スマホのカメラで問題カードを映し、注目箇所と吹き出しを重ねる
export default function CameraStage({ problem, view, onSelect, onFallback }) {
  const containerRef = useRef(null);
  const sessionRef = useRef(null);
  const viewRef = useRef(view);
  const selectRef = useRef(onSelect);
  const [status, setStatus] = useState('準備中…');
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const alive = () => !controller.signal.aborted;
    startCamera({
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
      console.warn('カメラ表示を開始できませんでした', e);
      setError(ERRORS[e?.code] ? e.code : 'camera');
    });
    return () => {
      controller.abort();
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [problem, attempt]);

  useEffect(() => {
    viewRef.current = view;
    selectRef.current = onSelect;
    sessionRef.current?.setView(view);
  });

  const retry = () => {
    setError(null);
    setStatus('準備中…');
    setAttempt(a => a + 1);
  };
  const ready = !status && !error;

  return (
    <div className="camera-stage" ref={containerRef}>
      {ready && (
        <span className={`stage-button camera-tracking ${tracking ? 'on' : ''}`} role="status">
          {tracking ? 'カードを認識中' : 'カード全体が映るように向けてください'}
        </span>
      )}
      {!ready && (
        <div className="stage-status">
          {error ? (
            <div className="stage-error" role="alert">
              <p>{ERRORS[error]}</p>
              <div className="focus-actions">
                {RETRYABLE.includes(error) && <button onClick={retry}>もう一度試す</button>}
                <button className="primary" onClick={onFallback}>立体で表示</button>
              </div>
            </div>
          ) : (
            <p role="status">{status}</p>
          )}
        </div>
      )}
    </div>
  );
}
