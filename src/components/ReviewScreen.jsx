import { useApp } from '../contexts/AppContext';

export default function ReviewScreen() {
  const { state, dispatch, questions } = useApp();

  // Aggregate mistakes by tag
  const tagStats = {};
  state.mistakeHistory.forEach(m => {
    m.tags.forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { count: 0, questionIds: new Set() };
      tagStats[tag].count += 1;
      tagStats[tag].questionIds.add(m.questionId);
    });
  });

  const sortedTags = Object.entries(tagStats)
    .map(([tag, data]) => ({ tag, count: data.count, questionCount: data.questionIds.size }))
    .sort((a, b) => b.count - a.count);

  // Recent mistakes (last 20)
  const recentMistakes = [...state.mistakeHistory]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  return (
    <div className="review-screen">
      <div className="review-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'home' })}>
          ← 戻る
        </button>
        <h1>学習履歴</h1>
      </div>

      {state.mistakeHistory.length === 0 ? (
        <div className="empty-state">
          <p>まだ学習履歴がありません。</p>
          <p>問題を解いてみましょう！</p>
          <button
            className="menu-btn primary"
            onClick={() => dispatch({
              type: 'START_PRACTICE',
              questionIndices: questions.map((_, i) => i),
            })}
          >
            練習を始める
          </button>
        </div>
      ) : (
        <>
          <section className="review-section">
            <h2>苦手分野</h2>
            {sortedTags.length > 0 ? (
              <div className="weak-tags">
                {sortedTags.map(({ tag, count, questionCount }) => (
                  <div key={tag} className="weak-tag-card">
                    <div className="weak-tag-info">
                      <span className="weak-tag-name">{tag}</span>
                      <span className="weak-tag-detail">
                        {count}回ミス（{questionCount}問）
                      </span>
                    </div>
                    <button
                      className="review-tag-btn"
                      onClick={() => dispatch({ type: 'START_REVIEW', tags: [tag] })}
                    >
                      復習する
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>苦手分野はありません。</p>
            )}
          </section>

          <section className="review-section">
            <h2>最近のミス</h2>
            <div className="mistake-list">
              {recentMistakes.map((m, i) => {
                const q = questions.find(q => q.id === m.questionId);
                if (!q) return null;
                const step = q.steps[m.stepIndex];
                return (
                  <div key={i} className="mistake-item">
                    <div className="mistake-item-header">
                      <span className="mistake-q-title">{q.title}</span>
                      <span className="mistake-step">STEP {m.stepIndex + 1}</span>
                    </div>
                    <p className="mistake-detail">
                      {step.question}
                      → 選択: <strong>{step.choices[m.selectedIndex] || 'タイムアウト'}</strong>
                      （正解: {step.choices[step.correct]}）
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="review-actions">
            <button
              className="menu-btn warning"
              onClick={() => dispatch({ type: 'START_REVIEW', tags: [] })}
            >
              全ミス問題を復習
            </button>
            <button
              className="link-btn danger"
              onClick={() => {
                if (window.confirm('学習履歴をリセットしますか？')) {
                  dispatch({ type: 'CLEAR_HISTORY' });
                }
              }}
            >
              履歴をリセット
            </button>
          </div>
        </>
      )}
    </div>
  );
}
