import { createContext, useContext, useReducer, useEffect } from 'react';
import questions from '../data/questions';

const AppContext = createContext();

const STORAGE_KEY = 'math_app_state';

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
      stats: state.stats,
    }));
  } catch {
    // ignore
  }
}

const initialState = {
  // Navigation
  screen: 'home', // 'home' | 'question' | 'result' | 'review'

  // Question state
  currentQuestionIndex: 0,
  currentStepIndex: 0,
  stepResults: [], // { correct: boolean, selectedIndex: number }[]
  questionQueue: [], // indices into questions array

  // Timer mode
  timerMode: false,
  timerSeconds: 5,

  // Persistent data
  mistakeHistory: [], // { questionId, stepIndex, selectedIndex, tags, timestamp }[]
  completedQuestions: [], // questionId[]
  stats: { totalAnswered: 0, totalCorrect: 0 },
};

function getInitialState() {
  const saved = loadState();
  return {
    ...initialState,
    mistakeHistory: saved?.mistakeHistory || [],
    completedQuestions: saved?.completedQuestions || [],
    stats: saved?.stats || { totalAnswered: 0, totalCorrect: 0 },
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE': {
      return { ...state, screen: action.screen };
    }

    case 'START_PRACTICE': {
      const indices = action.questionIndices || questions.map((_, i) => i);
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

      if (isCorrect) {
        newStats.totalCorrect = state.stats.totalCorrect + 1;
      } else {
        newMistakes = [...state.mistakeHistory, {
          questionId: question.id,
          stepIndex: state.currentStepIndex,
          selectedIndex: action.selectedIndex,
          tags: question.tags,
          timestamp: Date.now(),
        }];
      }

      return {
        ...state,
        stepResults: newStepResults,
        mistakeHistory: newMistakes,
        stats: newStats,
      };
    }

    case 'NEXT_STEP': {
      const qIdx = state.questionQueue[state.currentQuestionIndex];
      const question = questions[qIdx];
      const nextStepIndex = state.currentStepIndex + 1;

      if (nextStepIndex < question.steps.length) {
        return { ...state, currentStepIndex: nextStepIndex };
      }

      // Question complete
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

      // All questions complete
      return {
        ...state,
        completedQuestions: newCompleted,
        screen: 'result',
      };
    }

    case 'START_REVIEW': {
      // Find questions with mistakes in specific tags
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
        stats: { totalAnswered: 0, totalCorrect: 0 },
      };
    }

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);

  useEffect(() => {
    saveState(state);
  }, [state.mistakeHistory, state.completedQuestions, state.stats]);

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
