import { useEffect, useRef, useState } from 'react';
import { useLearning, currentInsight } from '../lib/loadThinking.js';
import { nextAction } from '../lib/progress.js';
import { shortcutAction } from '../lib/shortcuts.js';
import { writeStore, STORE_KEYS } from '../lib/storage.js';
import { DISPLAYS } from '../lib/display.js';
import FocusGuide from './FocusGuide.jsx';
import SceneStage from './stages/SceneStage.jsx';
import TextStage from './stages/TextStage.jsx';
import CameraStage from './stages/CameraStage.jsx';

// 1問を学習する画面。上（PCでは左）に問題の表示、下（PCでは右）に注目箇所と気づきの一覧を置く
export default function LearnView({ problem, initialDisplay, onBack, onSummary }) {
  const learning = useLearning(problem);
  const [display, setDisplay] = useState(initialDisplay);
  const { state, nextId, select } = learning;
  const view = {
    shown: state.shown,
    activeId: state.activeId,
    nextId,
    focus: state.focus,
    cueSpan: currentInsight(problem, state)?.cueSpan ?? null,
  };

  // カメラ以外の表示は、次に開いたときにも使う
  const changeDisplay = (next) => {
    setDisplay(next);
    if (next !== 'camera') writeStore(STORE_KEYS.display, next);
  };

  // PC のキー操作（1〜9: 注目箇所を選ぶ、→ / N: 次へ）
  const keyRef = useRef(null);
  const onShortcut = (e) => {
    const action = shortcutAction(e, problem.focuses.length);
    if (!action) return;
    e.preventDefault();
    if (action.type === 'select') {
      select(problem.focuses[action.index].id);
      return;
    }
    const next = nextAction(state);
    if (next.type === 'show') learning.show();
    else if (next.type === 'advance') learning.advance();
    else if (next.type === 'select') select(next.id);
    else onSummary();
  };
  useEffect(() => {
    keyRef.current = onShortcut;
  });
  useEffect(() => {
    const onKey = (e) => keyRef.current?.(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`learn-view display-${display}`}>
      <header className="learn-header">
        <button className="back-btn" onClick={onBack} aria-label="戻る">←</button>
        <h2>{problem.title}</h2>
        {problem.draft && <span className="thinking-badge warn">下書き</span>}
        <div className="display-switch" role="group" aria-label="表示のしかた">
          {DISPLAYS.map(d => (
            <button
              key={d.key}
              className={display === d.key ? 'active' : ''}
              aria-pressed={display === d.key}
              title={d.description}
              onClick={() => changeDisplay(d.key)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </header>

      <div className="learn-body">
        <div className="learn-stage">
          {display === 'scene' && (
            <SceneStage problem={problem} view={view} onSelect={select} onFallback={() => changeDisplay('text')} />
          )}
          {display === 'text' && <TextStage problem={problem} learning={learning} />}
          {display === 'camera' && (
            <CameraStage problem={problem} view={view} onSelect={select} onFallback={() => changeDisplay('scene')} />
          )}
        </div>
        <aside className="learn-panel" aria-label="注目箇所と気づき">
          <FocusGuide problem={problem} learning={learning} onSummary={onSummary} />
          <p className="key-hint">キー操作：1〜{Math.min(9, problem.focuses.length)} で注目箇所を選ぶ、→ で次へ</p>
        </aside>
      </div>
    </div>
  );
}
