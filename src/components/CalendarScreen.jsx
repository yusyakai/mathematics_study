import { useApp } from '../contexts/AppContext';
import { calculateStreak } from '../contexts/AppContext';

export default function CalendarScreen() {
  const { state, dispatch } = useApp();

  const streak = calculateStreak(state.learningDays);
  const learningSet = new Set(state.learningDays);

  // 過去12週間（84日）のカレンダーデータを生成
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weeks = [];
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - 83); // 84日前
  // 週の始まりを月曜に合わせる
  const dayOfWeek = startDay.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDay.setDate(startDay.getDate() + mondayOffset);

  let current = new Date(startDay);
  while (current <= today) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = formatDate(current);
      const isToday = dateStr === formatDate(today);
      const hasLearned = learningSet.has(dateStr);
      const isFuture = current > today;
      week.push({ date: dateStr, isToday, hasLearned, isFuture });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  // 月ラベル
  const months = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const d = new Date(week[0].date);
    const m = d.getMonth();
    if (m !== lastMonth) {
      months.push({ index: wi, label: `${m + 1}月` });
      lastMonth = m;
    }
  });

  const totalDays = state.learningDays.length;

  return (
    <div className="calendar-screen">
      <div className="review-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'home' })}>
          ← 戻る
        </button>
        <h1>学習カレンダー</h1>
      </div>

      <div className="calendar-stats">
        <div className="cal-stat">
          <span className="cal-stat-value">{streak > 0 ? '🔥' : ''} {streak}</span>
          <span className="cal-stat-label">日連続</span>
        </div>
        <div className="cal-stat">
          <span className="cal-stat-value">{totalDays}</span>
          <span className="cal-stat-label">学習日数</span>
        </div>
      </div>

      <div className="calendar-grid-wrapper">
        {/* 曜日ラベル */}
        <div className="calendar-day-labels">
          {['月', '火', '水', '木', '金', '土', '日'].map(d => (
            <span key={d} className="calendar-day-label">{d}</span>
          ))}
        </div>

        {/* 月ラベル */}
        <div className="calendar-month-labels">
          {months.map(({ index, label }) => (
            <span
              key={index}
              className="calendar-month-label"
              style={{ gridColumn: index + 1 }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* ヒートマップ本体 */}
        <div className="calendar-heatmap">
          {weeks.map((week, wi) => (
            <div key={wi} className="calendar-week">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`calendar-cell ${day.hasLearned ? 'learned' : ''} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}`}
                  title={day.isFuture ? '' : `${day.date}${day.hasLearned ? ' ✓' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="calendar-legend">
          <span className="calendar-legend-label">少ない</span>
          <div className="calendar-cell" />
          <div className="calendar-cell learned" />
          <span className="calendar-legend-label">学習済み</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
