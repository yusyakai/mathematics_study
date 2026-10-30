import { useEffect, useRef } from 'react';
import { ROLES } from '../lib/catalog.js';
import { focusColor } from '../lib/colors.js';
import { hasPending, revealedTotal, nextAction } from '../lib/progress.js';
import { insightTotal } from '../lib/model.js';
import { FocusHead, InsightCard } from './InsightCard.jsx';
import Icon from './Icon.jsx';

// 注目箇所の番号ボタンと、選んだ箇所の気づき（優先順位の高いものから1個ずつ）
//   learning: useLearning() の戻り値
//   footer  : 操作ボタンの下に添える内容（PC のキー操作の案内など）
// 「次へ」のボタンは一覧の下端に固定し、気づきが増えて一覧が長くなっても同じ位置で押せるようにする
export default function FocusGuide({ problem, learning, onSummary, footer = null }) {
  const { state, promptFirst, complete, nextId, show, select, advance, reset, setPromptFirst } = learning;

  // 気づきが増えたら、いちばん新しい気づきが見えるところまで一覧を動かす
  const areaRef = useRef(null);
  const activeEntry = state.activeId ? state.focus[state.activeId] : null;
  useEffect(() => {
    const items = areaRef.current?.querySelectorAll('.insight');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    items?.[items.length - 1]?.scrollIntoView({ block: 'end', behavior: reduce ? 'auto' : 'smooth' });
  }, [state.activeId, activeEntry?.opened, activeEntry?.revealed]);

  const modeToggle = (
    <label className="switch">
      <input type="checkbox" checked={promptFirst} onChange={e => setPromptFirst(e.target.checked)} />
      考えてから見る
    </label>
  );

  if (!state.shown) {
    return (
      <div className="focus-guide">
        <div className="guide-intro">
          <span className="guide-intro-icon"><Icon name="eye" size={22} /></span>
          <div>
            <p className="guide-title">まずは自分で問題文を読もう</p>
            <p className="guide-text">どこから見ればよいかを考えてから、見る順番を表示します。</p>
          </div>
        </div>
        <div className="guide-footer">
          <button className="btn primary block lg" onClick={show}>見る順番を表示</button>
          <div className="guide-options">{modeToggle}</div>
          {footer}
        </div>
      </div>
    );
  }

  const activeIndex = problem.focuses.findIndex(f => f.id === state.activeId);
  const active = problem.focuses[activeIndex];
  const entry = active ? state.focus[active.id] : null;
  const pending = Boolean(active) && hasPending(state, active.id);
  const anyOpened = state.order.some(id => state.focus[id].opened > 0);

  // 次の操作のボタン（キー操作の「→」と同じ）
  const act = nextAction(state);
  const target = act.id ? problem.focuses.findIndex(f => f.id === act.id) : -1;
  const targetLabel = target >= 0 ? `${target + 1}「${problem.focuses[target].quote}」` : '';
  const labels = {
    answer: '答えを見る',
    more: `${promptFirst ? '次の問いかけ' : '次の気づき'}（あと${act.remaining}個）`,
    first: `${target + 1}番を見る（「${problem.focuses[target]?.quote}」）`,
    next: `次の注目箇所へ（${targetLabel}）`,
    continue: `続きを見る（${targetLabel}）`,
  };
  const action = act.type === 'summary'
    ? <button className="btn primary block lg" onClick={onSummary}>振り返りを見る<Icon name="arrowRight" /></button>
    : <button className="btn primary block lg" onClick={act.type === 'advance' ? advance : () => select(act.id)}>{labels[act.step]}</button>;

  return (
    <div className="focus-guide">
      <div className="guide-top">
        <div className="focus-chips" role="group" aria-label="注目箇所（番号は見る順番）">
          {problem.focuses.map((f, i) => {
            const e = state.focus[f.id];
            const done = e.revealed === f.insights.length;
            const status = done ? '見終わった' : e.opened > 0 ? '途中' : '未読';
            return (
              <button
                key={f.id}
                className={`focus-chip ${e.opened > 0 ? 'opened' : ''} ${done ? 'done' : ''} ${f.id === state.activeId ? 'active' : ''} ${f.id === nextId ? 'next' : ''}`}
                style={{ '--focus': focusColor(i) }}
                onClick={() => select(f.id)}
                aria-label={`${i + 1}番 ${ROLES[f.role].label}「${f.quote}」（${status}）`}
                aria-pressed={f.id === state.activeId}
              >
                {i + 1}
                {done && <span className="chip-done" aria-hidden="true"><Icon name="check" size={10} /></span>}
              </button>
            );
          })}
        </div>
        <span className="guide-count">気づき <strong>{revealedTotal(state)}</strong> / {insightTotal(problem)}</span>
      </div>

      <div className="insight-area" ref={areaRef} aria-live="polite">
        {active ? (
          <>
            <FocusHead focus={active} index={activeIndex} />
            <ol className="insight-list" style={{ '--focus': focusColor(activeIndex) }}>
              {active.insights.slice(0, entry.revealed).map((s, i) => (
                <InsightCard key={s.priority} insight={s} order={i + 1} />
              ))}
              {pending && <InsightCard insight={active.insights[entry.revealed]} prompt />}
            </ol>
          </>
        ) : (
          <p className="guide-text">番号の順に見ていこう。問題文の印をタップしても選べます。</p>
        )}
        {complete && !pending && (
          <p className="guide-done"><Icon name="check" size={16} />すべての気づきを見ました</p>
        )}
      </div>

      <div className="guide-footer">
        {action}
        <div className="guide-options">
          {modeToggle}
          {anyOpened && <button className="btn ghost sm" onClick={reset}><Icon name="refresh" size={16} />最初から</button>}
        </div>
        {footer}
      </div>
    </div>
  );
}
