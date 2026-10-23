import { useState } from 'react';
import { useApp, DAILY_GOAL, calculateStreak, getSrsQuestions } from '../contexts/AppContext';
import { SUBJECTS, DIFFICULTIES, DIFFICULTY_ORDER } from '../data/categories';

export default function HomeScreen() {
  const { state, dispatch, questions } = useApp();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  const weakTags = getWeakTags(state.mistakeHistory);
  const accuracy = state.stats.totalAnswered > 0
    ? Math.round((state.stats.totalCorrect / state.stats.totalAnswered) * 100)
    : 0;

  // ストリーク
  const streak = calculateStreak(state.learningDays);

  // デイリー目標
  const today = new Date().toISOString().slice(0, 10);
  const dailyAnswered = state.dailyProgress.date === today
    ? state.dailyProgress.questionsAnswered
    : 0;
  const dailyComplete = dailyAnswered >= DAILY_GOAL;
  const dailyPercent = Math.min(100, Math.round((dailyAnswered / DAILY_GOAL) * 100));

  // SRS復習の問題数
  const srsQuestionIds = getSrsQuestions(state.mistakeHistory);
  const srsCount = srsQuestionIds.size;

  // 科目でフィルタリング
  const filteredBySubject = selectedSubject
    ? questions.filter(q => q.subject === selectedSubject)
    : questions;

  // 難易度でフィルタリング
  const filteredQuestions = selectedDifficulty
    ? filteredBySubject.filter(q => q.difficulty === selectedDifficulty)
    : filteredBySubject;

  // 選択中の科目の単元一覧
  const unitsInSubject = selectedSubject
    ? [...new Set(filteredBySubject.map(q => q.unit))]
    : [];

  // 科目ごとの問題数
  const subjectCounts = {};
  Object.keys(SUBJECTS).forEach(key => {
    subjectCounts[key] = questions.filter(q => q.subject === key).length;
  });

  const startPractice = (questionList, timerMode = false) => {
    const indices = questionList.map(q => questions.indexOf(q));
    if (indices.length === 0) return;
    dispatch({ type: 'START_PRACTICE', questionIndices: indices, timerMode });
  };

  return (
    <div className="home-screen">
      <header className="home-header">
        <h1>解法セレクト</h1>
        <p className="subtitle">解法選択力を鍛える数学トレーニング</p>
      </header>

      {/* ストリーク & デイリー目標 */}
      <div className="streak-daily-card">
        <div className="streak-section">
          <div className="streak-flame">{streak > 0 ? '🔥' : '💤'}</div>
          <div className="streak-info">
            <span className="streak-count">{streak}</span>
            <span className="streak-label">日連続</span>
          </div>
        </div>
        <div className="daily-section">
          <div className="daily-header">
            <span className="daily-title">今日の目標</span>
            <span className="daily-count">
              {dailyAnswered} / {DAILY_GOAL}問
              {dailyComplete && ' ✅'}
            </span>
          </div>
          <div className="daily-bar">
            <div
              className={`daily-bar-fill ${dailyComplete ? 'complete' : ''}`}
              style={{ width: `${dailyPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 統計カード */}
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

      {/* SRS復習ボタン */}
      {srsCount > 0 && (
        <button
          className="menu-btn srs"
          onClick={() => dispatch({ type: 'START_SRS_REVIEW' })}
        >
          <span className="menu-btn-icon">🧠</span>
          復習タイミングの問題
          <span className="menu-btn-sub">{srsCount}問</span>
        </button>
      )}

      {/* 難易度フィルター */}
      <div className="difficulty-section">
        <h2>難易度</h2>
        <div className="difficulty-bar">
          <button
            className={`diff-btn ${selectedDifficulty === null ? 'active' : ''}`}
            onClick={() => setSelectedDifficulty(null)}
          >
            全て
          </button>
          {DIFFICULTY_ORDER.map(key => (
            <button
              key={key}
              className={`diff-btn ${selectedDifficulty === key ? 'active' : ''}`}
              style={selectedDifficulty === key ? { background: DIFFICULTIES[key].color, borderColor: DIFFICULTIES[key].color } : {}}
              onClick={() => setSelectedDifficulty(selectedDifficulty === key ? null : key)}
            >
              {DIFFICULTIES[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* 科目カテゴリ */}
      <div className="category-section">
        <h2>科目</h2>
        <div className="category-grid">
          {Object.entries(SUBJECTS).map(([key, subject]) => (
            <button
              key={key}
              className={`category-btn ${selectedSubject === key ? 'active' : ''}`}
              style={selectedSubject === key ? { borderColor: subject.color, background: subject.color + '15' } : {}}
              onClick={() => setSelectedSubject(selectedSubject === key ? null : key)}
            >
              <span className="category-dot" style={{ background: subject.color }} />
              <span className="category-label">{subject.label}</span>
              <span className="category-count">{subjectCounts[key]}問</span>
            </button>
          ))}
        </div>
      </div>

      {/* 科目選択時: 単元一覧 */}
      {selectedSubject && unitsInSubject.length > 0 && (
        <div className="unit-section">
          <h2>{SUBJECTS[selectedSubject].label} の単元</h2>
          <div className="unit-list">
            {unitsInSubject.map(unit => {
              const unitQuestions = filteredQuestions.filter(q => q.unit === unit);
              if (unitQuestions.length === 0) return null;
              return (
                <button
                  key={unit}
                  className="unit-btn"
                  onClick={() => startPractice(unitQuestions)}
                >
                  <span className="unit-name">{unit}</span>
                  <span className="unit-count">{unitQuestions.length}問</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="menu-section">
        <button
          className="menu-btn primary"
          onClick={() => startPractice(filteredQuestions)}
          disabled={filteredQuestions.length === 0}
        >
          <span className="menu-btn-icon">▶</span>
          {selectedSubject || selectedDifficulty ? '絞り込み練習' : '全問練習'}
          <span className="menu-btn-sub">{filteredQuestions.length}問</span>
        </button>

        <button
          className="menu-btn accent"
          onClick={() => startPractice(filteredQuestions, true)}
          disabled={filteredQuestions.length === 0}
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

      {/* 分野別タグ */}
      {!selectedSubject && (
        <div className="tag-section">
          <h2>分野別</h2>
          <div className="tag-grid">
            {[...new Set(questions.flatMap(q => q.tags))].map(tag => {
              const tagQuestions = questions.filter(q => q.tags.includes(tag));
              return (
                <button
                  key={tag}
                  className="tag-btn"
                  onClick={() => startPractice(tagQuestions)}
                >
                  {tag}
                  <span className="tag-count">{tagQuestions.length}問</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <footer className="home-footer">
        <div className="footer-links">
          <button
            className="footer-link-btn"
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'progress' })}
          >
            📊 分野別進捗
          </button>
          <button
            className="footer-link-btn"
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'calendar' })}
          >
            📅 学習カレンダー
          </button>
          <button
            className="footer-link-btn"
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'formula' })}
          >
            📐 公式集
          </button>
          <button
            className="footer-link-btn"
            onClick={() => dispatch({ type: 'NAVIGATE', screen: 'review' })}
          >
            📝 学習履歴
          </button>
        </div>
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
