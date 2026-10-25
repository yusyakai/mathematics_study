import { KINDS, ROLES, promptFor } from '../lib/catalog.js';
import { focusColor, KIND_COLORS } from '../lib/colors.js';
import { hasPending, revealedTotal } from '../lib/progress.js';
import { insightTotal } from '../lib/model.js';

// 注目箇所の番号ボタンと、選んだ箇所の気づき（優先順位の高いものから1個ずつ）
//   learning: useLearning() の戻り値
export default function FocusGuide({ problem, learning, onSummary }) {
  const { state, promptFirst, complete, nextId, show, select, advance, reset, setPromptFirst } = learning;

  const modeToggle = (
    <label className="mode-toggle">
      <input type="checkbox" checked={promptFirst} onChange={e => setPromptFirst(e.target.checked)} />
      考えてから見る
    </label>
  );

  if (!state.shown) {
    return (
      <div className="focus-guide">
        <p className="focus-hint">まずは自分で問題文を読もう。どこから見ればいい？</p>
        <div className="focus-actions">
          <button className="primary" onClick={show}>見る順番を表示</button>
        </div>
        <div className="focus-footer">{modeToggle}</div>
      </div>
    );
  }

  const activeIndex = problem.focuses.findIndex(f => f.id === state.activeId);
  const active = problem.focuses[activeIndex];
  const entry = active ? state.focus[active.id] : null;
  const pending = Boolean(active) && hasPending(state, active.id);
  const remaining = entry ? active.insights.length - entry.opened : 0;
  const next = problem.focuses.find(f => f.id === nextId);
  // 開いたが見終わっていない注目箇所（すべて開いた後に、残りへ案内する）
  const unfinished = problem.focuses.find(f => f.id !== state.activeId && state.focus[f.id].revealed < f.insights.length);
  const anyOpened = state.order.some(id => state.focus[id].opened > 0);

  let action = null;
  if (pending) {
    action = <button className="primary" onClick={advance}>答えを見る</button>;
  } else if (remaining > 0) {
    action = <button className="primary" onClick={advance}>{promptFirst ? '次の問いかけ' : '次の気づき'}（あと{remaining}個）</button>;
  } else if (next) {
    action = (
      <button className="primary" onClick={() => select(next.id)}>
        {active ? '次の注目箇所へ' : `${problem.focuses.indexOf(next) + 1}番を見る`}（「{next.quote}」）
      </button>
    );
  } else if (unfinished) {
    action = (
      <button className="primary" onClick={() => select(unfinished.id)}>
        続きを見る（{problem.focuses.indexOf(unfinished) + 1}「{unfinished.quote}」）
      </button>
    );
  } else if (complete) {
    action = <button className="primary" onClick={onSummary}>振り返りを見る</button>;
  }

  return (
    <div className="focus-guide">
      <div className="focus-chips">
        {problem.focuses.map((f, i) => {
          const e = state.focus[f.id];
          const status = e.revealed === f.insights.length ? '見終わった' : e.opened > 0 ? '途中' : '未読';
          return (
            <button
              key={f.id}
              className={`focus-chip ${e.opened > 0 ? 'opened' : ''} ${f.id === state.activeId ? 'active' : ''} ${f.id === nextId ? 'next' : ''}`}
              style={{ '--focus': focusColor(i) }}
              onClick={() => select(f.id)}
              aria-label={`${i + 1}番 ${ROLES[f.role].label}「${f.quote}」（${status}）`}
              aria-pressed={f.id === state.activeId}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="insight-area" aria-live="polite">
        {active ? (
          <div className="insight-list">
            <div className="insight-quote">
              <span className="focus-num" style={{ '--focus': focusColor(activeIndex) }}>{activeIndex + 1}</span>
              <span className="role-chip">{ROLES[active.role].label}</span>
              <span>「{active.quote}」</span>
            </div>
            {active.insights.slice(0, entry.revealed).map((s, i) => (
              <div key={s.priority} className="insight">
                <div className="insight-cue">
                  <span className="kind-chip" style={{ '--kind': KIND_COLORS[s.kind] }}>{KINDS[s.kind].label}</span>
                  「{s.cue}」と書いてある
                  <span className="sr-only">（{i + 1}個目）</span>
                </div>
                <div className="insight-thought">→ {s.thought}</div>
              </div>
            ))}
            {pending && (
              <div className="insight prompt">
                <div className="insight-cue">
                  <span className="kind-chip" style={{ '--kind': KIND_COLORS[active.insights[entry.revealed].kind] }}>
                    {KINDS[active.insights[entry.revealed].kind].label}
                  </span>
                  考えてみよう
                </div>
                <div className="insight-thought">{promptFor(active.insights[entry.revealed])}</div>
              </div>
            )}
          </div>
        ) : (
          <p className="focus-hint">1番の印から順にタップしよう。</p>
        )}
        {complete && !pending && <p className="focus-hint small">すべての気づきを見ました</p>}
      </div>

      {action && <div className="focus-actions">{action}</div>}
      <div className="focus-footer">
        {modeToggle}
        <span className="focus-count">見た気づき {revealedTotal(state)}/{insightTotal(problem)}</span>
        {anyOpened && <button className="focus-reset" onClick={reset}>最初から</button>}
      </div>
    </div>
  );
}
