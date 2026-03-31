import { createContext, useContext, useReducer, useEffect } from 'react';
import questions from '../data/questions';

const AppContext = createContext();

const STORAGE_KEY = 'math_app_state';
const DAILY_GOAL = 5; // デイリー目標問題数
const SRS_INTERVALS = [1, 3, 7, 14, 30]; // SRS間隔（日数）

// 日付をYYYY-MM-DD文字列に変換
function toDateStr(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  return toDateStr(Date.now());
}

// ストリーク計算
function calculateStreak(learningDays) {
  if (!learningDays || learningDays.length === 0) return 0;

  const sorted = [...new Set(learningDays)].sort().reverse();
  const today = todayStr();
  const yesterday = toDateStr(Date.now() - 86400000);

  // 今日または昨日の学習がなければストリークは0（今日学習すれば1）
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 0;
  let checkDate = new Date(sorted[0]);

  for (const day of sorted) {
    const dayDate = new Date(day);
    const diff = Math.round((checkDate - dayDate) / 86400000);
    if (diff > 1) break;
    streak++;
    checkDate = dayDate;
  }

  return streak;
}

// SRS: 次回出題日を計算
function getNextReviewDate(mistakeEntry) {
  const reviewCount = mistakeEntry.reviewCount || 0;
  const intervalDays = SRS_INTERVALS[Math.min(reviewCount, SRS_INTERVALS.length - 1)];
  const lastReview = mistakeEntry.lastReviewTimestamp || mistakeEntry.timestamp;
  return lastReview + intervalDays * 86400000;
}

// SRS: 今日復習すべき問題を取得
function getSrsQuestions(mistakeHistory) {
  const now = Date.now();
  const dueIds = new Set();

  // 各問題IDについて最新のミス記録を見る
  const latestByQuestion = {};
  mistakeHistory.forEach(m => {
    const key = m.questionId;
    if (!latestByQuestion[key] || m.timestamp > latestByQuestion[key].timestamp) {
      latestByQuestion[key] = m;
    }
  });

  Object.values(latestByQuestion).forEach(m => {
    if (m.mastered) return; // 習得済みはスキップ
    const nextDate = getNextReviewDate(m);
    if (now >= nextDate) {
      dueIds.add(m.questionId);
    }
  });

  return dueIds;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return null;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mistakeHistory: state.mistakeHistory,
      completedQuestions: state.completedQuestions,
      skippedQuestions: state.skippedQuestions,
      stats: state.stats,
      learningDays: state.learningDays,
      dailyProgress: state.dailyProgress,
    }));
  } catch {
    // ignore
  }
}

const initialState = {
  // Navigation
  screen: 'home', // 'home' | 'question' | 'result' | 'review' | 'explanation'

  // Question state
  currentQuestionIndex: 0,
  currentStepIndex: 0,
  stepResults: [], // { correct: boolean, selectedIndex: number }[]
  questionQueue: [], // indices into questions array

  // Timer mode
  timerMode: false,
  timerSeconds: 5,

  // 不正解時の解説データ
  explanationData: null,

  // Persistent data
  mistakeHistory: [], // { questionId, stepIndex, selectedIndex, tags, timestamp, reviewCount?, lastReviewTimestamp?, mastered? }[]
  completedQuestions: [], // questionId[]
  skippedQuestions: {}, // { [questionId]: timestamp }
  stats: { totalAnswered: 0, totalCorrect: 0 },

  // ストリーク & デイリー目標
  learningDays: [], // ['2026-03-31', '2026-03-30', ...]
  dailyProgress: { date: '', questionsAnswered: 0 }, // 今日の進捗
};

function getInitialState() {
  const saved = loadState();
  const today = todayStr();
  const savedDaily = saved?.dailyProgress || { date: '', questionsAnswered: 0 };

  return {
    ...initialState,
    mistakeHistory: saved?.mistakeHistory || [],
    completedQuestions: saved?.completedQuestions || [],
    skippedQuestions: saved?.skippedQuestions || {},
    stats: saved?.stats || { totalAnswered: 0, totalCorrect: 0 },
    learningDays: saved?.learningDays || [],
    dailyProgress: savedDaily.date === today
      ? savedDaily
      : { date: today, questionsAnswered: 0 },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE': {
      return { ...state, screen: action.screen };
    }

    case 'START_PRACTICE': {
      const now = Date.now();
      const SKIP_DURATION = 24 * 60 * 60 * 1000;
      const allIndices = action.questionIndices || questions.map((_, i) => i);
      const indices = allIndices.filter(i => {
        const skipTime = state.skippedQuestions[questions[i].id];
        return !skipTime || (now - skipTime) > SKIP_DURATION;
      });
      if (indices.length === 0) return { ...state, screen: 'home' };
      return {
        ...state,
        screen: 'question',
        questionQueue: indices,
        currentQuestionIndex: 0,
        currentStepIndex: 0,
        stepResults: [],
        timerMode: action.timerMode || false,
      };
    }

    case 'START_SRS_REVIEW': {
      const dueIds = getSrsQuestions(state.mistakeHistory);
      const indices = questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => dueIds.has(q.id))
        .map(({ i }) => i);

      if (indices.length === 0) return { ...state, screen: 'home' };

      return {
        ...state,
        screen: 'question',
        questionQueue: indices,
        currentQuestionIndex: 0,
        currentStepIndex: 0,
        stepResults: [],
        timerMode: false,
      };
    }

    case 'ANSWER_STEP': {
      const qIdx = state.questionQueue[state.currentQuestionIndex];
      const question = questions[qIdx];
      const step = question.steps[state.currentStepIndex];
      const isCorrect = action.selectedIndex === step.correct;

      const newStepResults = [...state.stepResults, {
        correct: isCorrect,
        selectedIndex: action.selectedIndex,
      }];

      let newMistakes = state.mistakeHistory;
      let newStats = { ...state.stats, totalAnswered: state.stats.totalAnswered + 1 };

      // 今日の学習記録を更新
      const today = todayStr();
      let newLearningDays = state.learningDays;
      if (!newLearningDays.includes(today)) {
        newLearningDays = [...newLearningDays, today];
      }
      const newDaily = state.dailyProgress.date === today
        ? { date: today, questionsAnswered: state.dailyProgress.questionsAnswered + 1 }
        : { date: today, questionsAnswered: 1 };

      if (isCorrect) {
        newStats.totalCorrect = state.stats.totalCorrect + 1;

        // SRS: 正解した場合、該当問題のreviewCountを増加
        newMistakes = state.mistakeHistory.map(m => {
          if (m.questionId === question.id && !m.mastered) {
            const newCount = (m.reviewCount || 0) + 1;
            return {
              ...m,
              reviewCount: newCount,
              lastReviewTimestamp: Date.now(),
              mastered: newCount >= SRS_INTERVALS.length,
            };
          }
          return m;
        });
      } else {
        // 不正解: 新しいミス記録を追加（reviewCountリセット）
        newMistakes = [...state.mistakeHistory.map(m => {
          if (m.questionId === question.id) {
            return { ...m, reviewCount: 0, lastReviewTimestamp: null, mastered: false };
          }
          return m;
        }), {
          questionId: question.id,
          stepIndex: state.currentStepIndex,
          selectedIndex: action.selectedIndex,
          tags: question.tags,
          timestamp: Date.now(),
          reviewCount: 0,
          lastReviewTimestamp: null,
          mastered: false,
        }];
      }

      return {
        ...state,
        stepResults: newStepResults,
        mistakeHistory: newMistakes,
        stats: newStats,
        learningDays: newLearningDays,
        dailyProgress: newDaily,
      };
    }

    case 'NEXT_STEP': {
      const qIdx = state.questionQueue[state.currentQuestionIndex];
      const question = questions[qIdx];
      const nextStepIndex = state.currentStepIndex + 1;

      if (nextStepIndex < question.steps.length) {
        return { ...state, currentStepIndex: nextStepIndex };
      }

      const newCompleted = state.completedQuestions.includes(question.id)
        ? state.completedQuestions
        : [...state.completedQuestions, question.id];

      const nextQuestionIndex = state.currentQuestionIndex + 1;

      if (nextQuestionIndex < state.questionQueue.length) {
        return {
          ...state,
          completedQuestions: newCompleted,
          currentQuestionIndex: nextQuestionIndex,
          currentStepIndex: 0,
          stepResults: [],
        };
      }

      return {
        ...state,
        completedQuestions: newCompleted,
        screen: 'result',
      };
    }

    case 'SKIP_QUESTION': {
      const qIdx = state.questionQueue[state.currentQuestionIndex];
      const question = questions[qIdx];
      const newSkipped = { ...state.skippedQuestions, [question.id]: Date.now() };

      const nextQuestionIndex = state.currentQuestionIndex + 1;

      if (nextQuestionIndex < state.questionQueue.length) {
        return {
          ...state,
          skippedQuestions: newSkipped,
          currentQuestionIndex: nextQuestionIndex,
          currentStepIndex: 0,
          stepResults: [],
        };
      }

      return {
        ...state,
        skippedQuestions: newSkipped,
        screen: 'result',
      };
    }

    case 'FAIL_QUESTION': {
      const qIdx = state.questionQueue[state.currentQuestionIndex];
      const question = questions[qIdx];
      return {
        ...state,
        screen: 'explanation',
        explanationData: {
          question,
          failedStepIndex: state.currentStepIndex,
          selectedIndex: action.selectedIndex,
          stepResults: state.stepResults,
        },
      };
    }

    case 'CONTINUE_AFTER_EXPLANATION': {
      const qIdx = state.questionQueue[state.currentQuestionIndex];
      const question = questions[qIdx];
      const newCompleted = state.completedQuestions.includes(question.id)
        ? state.completedQuestions
        : [...state.completedQuestions, question.id];

      const nextQuestionIndex = state.currentQuestionIndex + 1;

      if (nextQuestionIndex < state.questionQueue.length) {
        return {
          ...state,
          completedQuestions: newCompleted,
          screen: 'question',
          currentQuestionIndex: nextQuestionIndex,
          currentStepIndex: 0,
          stepResults: [],
          explanationData: null,
        };
      }

      return {
        ...state,
        completedQuestions: newCompleted,
        screen: 'result',
        explanationData: null,
      };
    }

    case 'START_REVIEW': {
      const targetTags = action.tags || [];
      const mistakeIds = new Set(
        state.mistakeHistory
          .filter(m => targetTags.length === 0 || m.tags.some(t => targetTags.includes(t)))
          .map(m => m.questionId)
      );

      const indices = questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => mistakeIds.has(q.id))
        .map(({ i }) => i);

      if (indices.length === 0) return { ...state, screen: 'home' };

      return {
        ...state,
        screen: 'question',
        questionQueue: indices,
        currentQuestionIndex: 0,
        currentStepIndex: 0,
        stepResults: [],
        timerMode: false,
      };
    }

    case 'CLEAR_HISTORY': {
      return {
        ...state,
        mistakeHistory: [],
        completedQuestions: [],
        skippedQuestions: {},
        stats: { totalAnswered: 0, totalCorrect: 0 },
        learningDays: [],
        dailyProgress: { date: todayStr(), questionsAnswered: 0 },
      };
    }

    default:
      return state;
  }
}

export { DAILY_GOAL, calculateStreak, getSrsQuestions };

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);

  useEffect(() => {
    saveState(state);
  }, [state.mistakeHistory, state.completedQuestions, state.skippedQuestions, state.stats, state.learningDays, state.dailyProgress]);

  return (
    <AppContext.Provider value={{ state, dispatch, questions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
