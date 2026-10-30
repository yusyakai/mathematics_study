import { useEffect, useRef, useState } from 'react';
import { useLearning, currentInsight } from '../lib/loadThinking.js';
import { nextAction, revealedTotal } from '../lib/progress.js';
import { insightTotal } from '../lib/model.js';
import { shortcutAction } from '../lib/shortcuts.js';
import { writeStore, STORE_KEYS } from '../lib/storage.js';
import { DISPLAYS } from '../lib/display.js';
import { DIFFICULTIES } from '../lib/catalog.js';
import FocusGuide from './FocusGuide.jsx';
import Icon from './Icon.jsx';
import SceneStage from './stages/SceneStage.jsx';
import TextStage from './stages/TextStage.jsx';
import CameraStage from './stages/CameraStage.jsx';

const DISPLAY_ICONS = { scene: 'cube', text: 'text', camera: 'camera' };

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
  const revealed = revealedTotal(state);
  const total = insightTotal(problem);

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

  const keys = Math.min(9, problem.focuses.length);

  return (
    <div className={`learn-view display-${display}`}>
      <header className="learn-header">
        <button className="icon-btn" onClick={onBack} aria-label="戻る"><Icon name="back" size={20} /></button>
        <div className="learn-title">
          <h2>
            {problem.title}
            {problem.draft && <span className="tag warn">下書き</span>}
          </h2>
          <p>{[problem.subject, problem.unit, DIFFICULTIES[problem.difficulty]?.label].filter(Boolean).join('・')}</p>
        </div>
        <div className="segmented display-switch" role="group" aria-label="表示のしかた">
          {DISPLAYS.map(d => (
            <button
              key={d.key}
              className={display === d.key ? 'active' : ''}
              aria-pressed={display === d.key}
              title={d.description}
              onClick={() => changeDisplay(d.key)}
            >
              <Icon name={DISPLAY_ICONS[d.key]} size={16} />
              <span>{d.label}</span>
            </button>
          ))}
        </div>
        <div
          className="learn-progress"
          role="progressbar"
          aria-label="見た気づき"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={revealed}
        >
          <span style={{ width: `${total ? (revealed / total) * 100 : 0}%` }} />
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
          <FocusGuide
            problem={problem}
            learning={learning}
            onSummary={onSummary}
            footer={
              <p className="key-hint">
                キー操作：<kbd>1</kbd>{keys > 1 && <>〜<kbd>{keys}</kbd></>} で注目箇所を選ぶ、<kbd>→</kbd> で次へ
              </p>
            }
          />
        </aside>
      </div>
    </div>
  );
}
