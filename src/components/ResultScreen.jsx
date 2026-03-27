import { useApp } from '../contexts/AppContext';

export default function ResultScreen() {
  const { state, dispatch, questions } = useApp();

  // Gather results from the last session
  const sessionQuestions = state.questionQueue.map(idx => questions[idx]);
  const totalSteps = sessionQuestions.reduce((sum, q) => sum + q.steps.length, 0);

  // Count recent mistakes (from this session)
  const sessionMistakes = state.mistakeHistory.filter(m =>
    sessionQuestions.some(q => q.id === m.questionId) &&
    Date.now() - m.timestamp < 60 * 60 * 1000 // last hour
  );

  const correctSteps = totalSteps - sessionMistakes.length;
  const accuracy = totalSteps > 0 ? Math.round((correctSteps / totalSteps) * 100) : 0;

  // Mistake breakdown by tag
  const tagBreakdown = {};
  sessionMistakes.forEach(m => {
    m.tags.forEach(tag => {
      tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
    });
  });

  const getGrade = (acc) => {
    if (acc >= 90) return { emoji: '🎉', text: '素晴らしい！', className: 'grade-excellent' };
    if (acc >= 70) return { emoji: '👍', text: 'いい調子！', className: 'grade-good' };
    if (acc >= 50) return { emoji: '💪', text: 'もう少し！', className: 'grade-fair' };
    return { emoji: '📖', text: '復習しよう！', className: 'grade-needs-work' };
  };

  const grade = getGrade(accuracy);

  return (
    <div className="result-screen">
      <div className={`result-hero ${grade.className}`}>
        <span className="result-emoji">{grade.emoji}</span>
        <h1>{grade.text}</h1>
        <div className="result-accuracy">{accuracy}%</div>
        <p className="result-detail">{correctSteps} / {totalSteps} ステップ正解</p>
      </div>

      {Object.keys(tagBreakdown).length > 0 && (
        <div className="mistake-analysis">
          <h2>誤答分析</h2>
          <div className="tag-mistakes">
            {Object.entries(tagBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([tag, count]) => (
                <div key={tag} className="tag-mistake-row">
                  <span className="tag-name">{tag}</span>
                  <span className="tag-mistake-count">{count}回ミス</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="result-actions">
        {sessionMistakes.length > 0 && (
          <button
            className="menu-btn warning"
            onClick={() => {
              const mistakeTags = [...new Set(sessionMistakes.flatMap(m => m.tags))];
              dispatch({ type: 'START_REVIEW', tags: mistakeTags });
            }}
          >
            <span className="menu-btn-icon">↻</span>
            間違えた問題を復習
          </button>
        )}
        <button
          className="menu-btn primary"
          onClick={() => dispatch({
            type: 'START_PRACTICE',
            questionIndices: questions.map((_, i) => i),
          })}
        >
          <span className="menu-btn-icon">▶</span>
          もう一度チャレンジ
        </button>
        <button
          className="menu-btn"
          onClick={() => dispatch({ type: 'NAVIGATE', screen: 'home' })}
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
