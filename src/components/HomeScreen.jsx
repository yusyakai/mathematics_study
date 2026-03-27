import { useApp } from '../contexts/AppContext';

export default function HomeScreen() {
  const { state, dispatch, questions } = useApp();

  const weakTags = getWeakTags(state.mistakeHistory);
  const accuracy = state.stats.totalAnswered > 0
    ? Math.round((state.stats.totalCorrect / state.stats.totalAnswered) * 100)
    : 0;

  const allTags = [...new Set(questions.flatMap(q => q.tags))];

  return (
    <div className="home-screen">
      <header className="home-header">
        <h1>解法セレクト</h1>
        <p className="subtitle">解法選択力を鍛える数学トレーニング</p>
      </header>

      {state.stats.totalAnswered > 0 && (
        <div className="stats-card">
          <div className="stat">
            <span className="stat-value">{state.stats.totalAnswered}</span>
            <span className="stat-label">回答数</span>
          </div>
          <div className="stat">
            <span className="stat-value">{accuracy}%</span>
            <span className="stat-label">正答率</span>
          </div>
          <div className="stat">
            <span className="stat-value">{state.completedQuestions.length}</span>
            <span className="stat-label">完了問題</span>
          </div>
        </div>
      )}

      <div className="menu-section">
        <button
          className="menu-btn primary"
          onClick={() => dispatch({
            type: 'START_PRACTICE',
            questionIndices: questions.map((_, i) => i),
          })}
        >
          <span className="menu-btn-icon">▶</span>
          全問練習
          <span className="menu-btn-sub">{questions.length}問</span>
        </button>

        <button
          className="menu-btn accent"
          onClick={() => dispatch({
            type: 'START_PRACTICE',
            questionIndices: questions.map((_, i) => i),
            timerMode: true,
          })}
        >
          <span className="menu-btn-icon">⏱</span>
          タイムアタック
          <span className="menu-btn-sub">5秒制限</span>
        </button>

        {weakTags.length > 0 && (
          <button
            className="menu-btn warning"
            onClick={() => dispatch({ type: 'START_REVIEW', tags: weakTags.map(t => t.tag) })}
          >
            <span className="menu-btn-icon">↻</span>
            苦手復習
            <span className="menu-btn-sub">{weakTags.map(t => t.tag).join('・')}</span>
          </button>
        )}
      </div>

      <div className="tag-section">
        <h2>分野別</h2>
        <div className="tag-grid">
          {allTags.map(tag => {
            const tagQuestions = questions
              .map((q, i) => ({ q, i }))
              .filter(({ q }) => q.tags.includes(tag));
            return (
              <button
                key={tag}
                className="tag-btn"
                onClick={() => dispatch({
                  type: 'START_PRACTICE',
                  questionIndices: tagQuestions.map(({ i }) => i),
                })}
              >
                {tag}
                <span className="tag-count">{tagQuestions.length}問</span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className="home-footer">
        <button
          className="link-btn"
          onClick={() => dispatch({ type: 'NAVIGATE', screen: 'review' })}
        >
          学習履歴を見る
        </button>
      </footer>
    </div>
  );
}

function getWeakTags(mistakeHistory) {
  const tagCounts = {};
  mistakeHistory.forEach(m => {
    m.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}
