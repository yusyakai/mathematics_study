import { INSIGHT_KINDS } from '../../thinking/schema';
import { focusColor } from '../../thinking/loadThinking';

// 見る順番の番号ボタンと、選んだ注目箇所の気づき
export default function FocusGuide({ problem, progress }) {
  const { shown, show, opened, activeId, open, reset, next } = progress;

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

  return (
    <div className="focus-guide">
      <div className="focus-chips">
        {problem.focuses.map((f, i) => (
          <button
            key={f.id}
            className={`focus-chip ${opened.has(f.id) ? 'opened' : ''} ${f.id === activeId ? 'active' : ''} ${f.id === next?.id ? 'next' : ''}`}
            style={{ '--focus': focusColor(i) }}
            onClick={() => open(f.id)}
            aria-label={`${i + 1}番目: ${f.quote}`}
          >
            {i + 1}
          </button>
        ))}
        {opened.size > 0 && <button className="focus-reset" onClick={reset}>最初から</button>}
      </div>

      {active ? (
        <InsightList focus={active} index={activeIndex} />
      ) : (
        <p className="focus-hint">番号の順に、問題文の印をタップしよう。</p>
      )}
      {active && (
        <p className="focus-hint small">
          {next ? `次は ${problem.focuses.indexOf(next) + 1} 番「${next.quote}」` : 'すべての注目箇所を見ました'}
        </p>
      )}
    </div>
  );
}

function InsightList({ focus, index }) {
  return (
    <div className="insight-list" key={focus.id}>
      <div className="insight-quote" style={{ '--focus': focusColor(index) }}>
        <span className="focus-num">{index + 1}</span>「{focus.quote}」
      </div>
      {focus.insights.map((s, i) => (
        <div key={i} className={`insight insight-${s.kind}`}>
          <div className="insight-cue">
            <span className="insight-kind">{INSIGHT_KINDS[s.kind].label}</span>
            「{s.cue}」{INSIGHT_KINDS[s.kind].phrase}
          </div>
          <div className="insight-thought">→ {s.thought}</div>
        </div>
      ))}
    </div>
  );
}
