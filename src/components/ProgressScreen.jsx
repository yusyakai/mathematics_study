import { useApp } from '../contexts/AppContext';
import { SUBJECTS } from '../data/categories';

export default function ProgressScreen() {
  const { state, dispatch, questions } = useApp();

  // 科目ごとの進捗を計算
  const subjectProgress = {};
  Object.entries(SUBJECTS).forEach(([key, subject]) => {
    const subjectQuestions = questions.filter(q => q.subject === key);
    const total = subjectQuestions.length;
    const completed = subjectQuestions.filter(q => state.completedQuestions.includes(q.id)).length;
    const mistakes = state.mistakeHistory.filter(m =>
      subjectQuestions.some(q => q.id === m.questionId)
    ).length;

    // 単元ごとの進捗
    const units = {};
    subjectQuestions.forEach(q => {
      if (!units[q.unit]) {
        units[q.unit] = { total: 0, completed: 0, mistakes: 0 };
      }
      units[q.unit].total++;
      if (state.completedQuestions.includes(q.id)) {
        units[q.unit].completed++;
      }
    });
    state.mistakeHistory.forEach(m => {
      const q = subjectQuestions.find(q => q.id === m.questionId);
      if (q && units[q.unit]) {
        units[q.unit].mistakes++;
      }
    });

    if (total > 0) {
      subjectProgress[key] = {
        label: subject.label,
        color: subject.color,
        total,
        completed,
        mistakes,
        percent: Math.round((completed / total) * 100),
        units,
      };
    }
  });

  return (
    <div className="progress-screen">
      <div className="review-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'home' })}>
          ← 戻る
        </button>
        <h1>分野別進捗</h1>
      </div>

      {Object.keys(subjectProgress).length === 0 ? (
        <div className="empty-state">
          <p>問題データがありません。</p>
        </div>
      ) : (
        <div className="progress-list">
          {Object.entries(subjectProgress).map(([key, data]) => (
            <div key={key} className="progress-subject-card">
              <div className="progress-subject-header">
                <div className="progress-subject-info">
                  <span className="progress-dot" style={{ background: data.color }} />
                  <span className="progress-subject-name">{data.label}</span>
                </div>
                <span className="progress-subject-stat">
                  {data.completed}/{data.total}問 ({data.percent}%)
                </span>
              </div>
              <div className="progress-bar-outer">
                <div
                  className="progress-bar-inner"
                  style={{ width: `${data.percent}%`, background: data.color }}
                />
              </div>
              {/* 単元ごと */}
              <div className="progress-units">
                {Object.entries(data.units).map(([unit, uData]) => {
                  const uPercent = uData.total > 0
                    ? Math.round((uData.completed / uData.total) * 100)
                    : 0;
                  return (
                    <div key={unit} className="progress-unit-row">
                      <span className="progress-unit-name">{unit}</span>
                      <div className="progress-unit-bar-wrap">
                        <div className="progress-unit-bar">
                          <div
                            className="progress-unit-bar-fill"
                            style={{ width: `${uPercent}%`, background: data.color }}
                          />
                        </div>
                      </div>
                      <span className="progress-unit-stat">
                        {uData.completed}/{uData.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
