import { useEffect, useRef, useState } from 'react';
import { startScreen } from '../../lib/hosts/screenHost.js';

const ERRORS = {
  load: '立体表示の部品を読み込めませんでした。通信状況を確認して、もう一度お試しください。',
  webgl: 'このブラウザでは立体表示（WebGL）を使えません。',
};

// 立体表示：PC・スマホの画面の中に、問題カードと吹き出しを立体的に置く（カメラは使わない）
export default function SceneStage({ problem, view, onSelect, onFallback }) {
  const containerRef = useRef(null);
  const hostRef = useRef(null);
  const viewRef = useRef(view);
  const selectRef = useRef(onSelect);
  const [status, setStatus] = useState('準備中…');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const alive = () => !controller.signal.aborted;
    startScreen({
      container: containerRef.current,
      problem,
      signal: controller.signal,
      onStatus: s => alive() && setStatus(s),
      onSelect: id => selectRef.current(id),
    }).then(host => {
      if (!alive()) return host.stop();
      hostRef.current = host;
      host.setView(viewRef.current);
    }).catch(e => {
      if (!alive() || e?.code === 'aborted') return;
      console.warn('立体表示を開始できませんでした', e);
      setError(ERRORS[e?.code] ? e.code : 'load');
    });
    return () => {
      controller.abort();
      hostRef.current?.stop();
      hostRef.current = null;
    };
  }, [problem, attempt]);

  useEffect(() => {
    viewRef.current = view;
    selectRef.current = onSelect;
    hostRef.current?.setView(view);
  });

  const retry = () => {
    setError(null);
    setStatus('準備中…');
    setAttempt(a => a + 1);
  };

  return (
    <div className="scene-stage" ref={containerRef}>
      {!status && !error && (
        <button className="stage-button scene-reset" onClick={() => hostRef.current?.resetView()}>視点を戻す</button>
      )}
      {(status || error) && (
        <div className="stage-status">
          {error ? (
            <div className="stage-error" role="alert">
              <p>{ERRORS[error]}</p>
              <div className="focus-actions">
                {error === 'load' && <button onClick={retry}>もう一度試す</button>}
                <button className="primary" onClick={onFallback}>文字で表示</button>
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
