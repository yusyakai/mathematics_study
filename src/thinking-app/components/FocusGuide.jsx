import { focusColor } from '../lib/loadThinking';

// 注目箇所の番号ボタンと、選んだ箇所の気づき（優先順位の高いものから1個ずつ）
export default function FocusGuide({ problem, progress }) {
  const { shown, show, countOf, activeId, select, revealNext, reset, next } = progress;

  if (!shown) {
    return (
      <div className="focus-guide">
        <p className="focus-hint">まずは自分で問題文を読もう。どこから見ればいい？</p>
        <div className="focus-actions">
          <button className="primary" onClick={show}>見る順番を表示</button>
        </div>
      </div>
    );
  }

  const activeIndex = problem.focuses.findIndex(f => f.id === activeId);
  const active = problem.focuses[activeIndex];
  const count = active ? countOf(active.id) : 0;
  const remaining = active ? active.insights.length - count : 0;
  const nextIndex = next ? problem.focuses.indexOf(next) : -1;

  return (
    <div className="focus-guide">
      <div className="focus-chips">
        {problem.focuses.map((f, i) => (
          <button
            key={f.id}
            className={`focus-chip ${countOf(f.id) > 0 ? 'opened' : ''} ${f.id === activeId ? 'active' : ''} ${f.id === next?.id ? 'next' : ''}`}
            style={{ '--focus': focusColor(i) }}
            onClick={() => select(f.id)}
            aria-label={`${i + 1}番目: ${f.quote}`}
          >
            {i + 1}
          </button>
        ))}
        {countOf(problem.focuses[0].id) > 0 && <button className="focus-reset" onClick={reset}>最初から</button>}
      </div>

      {active ? (
        <>
          <div className="insight-list">
            <div className="insight-quote" style={{ '--focus': focusColor(activeIndex) }}>
              <span className="focus-num">{activeIndex + 1}</span>「{active.quote}」
            </div>
            {active.insights.slice(0, count).map((s, i) => (
              <div key={s.priority} className="insight">
                <div className="insight-cue">
                  <span className="insight-rank">{i + 1}</span>「{s.cue}」と書いてある
                </div>
                <div className="insight-thought">→ {s.thought}</div>
              </div>
            ))}
          </div>
          <div className="focus-actions">
            {remaining > 0 ? (
              <button className="primary" onClick={revealNext}>次の気づき（あと{remaining}個）</button>
            ) : next ? (
              <button className="primary" onClick={() => select(next.id)}>
                次の注目箇所へ（{nextIndex + 1}「{next.quote}」）
              </button>
            ) : (
              <p className="focus-hint small">すべての気づきを見ました</p>
            )}
          </div>
        </>
      ) : (
        <p className="focus-hint">1番の印から順にタップしよう。</p>
      )}
    </div>
  );
}
