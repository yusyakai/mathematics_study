import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { SUBJECTS, DIFFICULTIES } from '../data/categories';

function shuffleChoices(choices, correctIndex) {
  const indices = choices.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    shuffledChoices: indices.map(i => choices[i]),
    shuffledCorrect: indices.indexOf(correctIndex),
    indexMap: indices,
  };
}

export default function QuestionScreen() {
  const { state, dispatch, questions } = useApp();
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [timeLeft, setTimeLeft] = useState(state.timerMode ? 5 : null);
  const [timedOut, setTimedOut] = useState(false);

  const qIdx = state.questionQueue[state.currentQuestionIndex];
  const question = questions[qIdx];
  const step = question.steps[state.currentStepIndex];

  const shuffled = useMemo(
    () => shuffleChoices(step.choices, step.correct),
    [state.currentQuestionIndex, state.currentStepIndex]
  );

  const isCorrect = selectedIndex === shuffled.shuffledCorrect;

  useEffect(() => {
    if (!state.timerMode || answered) return;
    setTimeLeft(5);
    setTimedOut(false);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.currentStepIndex, state.currentQuestionIndex, state.timerMode, answered]);

  useEffect(() => {
    if (state.timerMode && timeLeft === 0 && !answered) {
      setTimedOut(true);
      handleAnswer(-1);
    }
  }, [timeLeft]);

  const handleAnswer = useCallback((displayIndex) => {
    if (answered) return;
    setSelectedIndex(displayIndex);
    const originalIndex = displayIndex >= 0 ? shuffled.indexMap[displayIndex] : -1;
    const correct = originalIndex === step.correct;

    setAnswered(true);
    dispatch({ type: 'ANSWER_STEP', selectedIndex: originalIndex });

    // 不正解 → 少し待ってから解説ページへ遷移
    if (!correct) {
      setTimeout(() => {
        dispatch({ type: 'FAIL_QUESTION', selectedIndex: originalIndex });
      }, 1200);
    }
  }, [answered, dispatch, shuffled.indexMap, step.correct]);

  const handleNext = () => {
    setAnswered(false);
    setSelectedIndex(null);
    setTimedOut(false);
    dispatch({ type: 'NEXT_STEP' });
  };

  const progress = ((state.currentStepIndex + 1) / question.steps.length) * 100;

  return (
    <div className="question-screen">
      <div className="question-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'NAVIGATE', screen: 'home' })}>
          ✕
        </button>
        <div className="question-info">
          <span className="question-title">{question.title}</span>
          <div className="question-meta">
            <span className="question-subject" style={{ color: SUBJECTS[question.subject]?.color }}>
              {SUBJECTS[question.subject]?.label}
            </span>
            <span className="question-unit">{question.unit}</span>
            <span className="question-diff" style={{ color: DIFFICULTIES[question.difficulty]?.color }}>
              {DIFFICULTIES[question.difficulty]?.label}
            </span>
            <span className="step-indicator">
              STEP {state.currentStepIndex + 1}/{question.steps.length}
            </span>
          </div>
        </div>
        {state.timerMode && !answered && (
          <div className={`timer ${timeLeft <= 2 ? 'timer-warning' : ''}`}>
            {timeLeft}s
          </div>
        )}
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="problem-text">
        <p>{question.problem}</p>
      </div>

      <div className="step-question">
        <h2>{step.question}</h2>
      </div>

      <div className="choices">
        {shuffled.shuffledChoices.map((choice, i) => {
          let className = 'choice-btn';
          if (answered) {
            if (i === shuffled.shuffledCorrect) className += ' correct';
            else if (i === selectedIndex) className += ' wrong';
            else className += ' dimmed';
          }
          return (
            <button
              key={i}
              className={className}
              onClick={() => handleAnswer(i)}
              disabled={answered}
            >
              <span className="choice-label">{String.fromCharCode(65 + i)}</span>
              <span className="choice-text">{choice}</span>
            </button>
          );
        })}
      </div>

      {/* 正解時のみインライン解説を表示 */}
      {answered && isCorrect && (
        <div className="feedback feedback-correct">
          <div className="feedback-header">⭕ 正解！</div>
          <p className="feedback-text">{step.explanation_correct}</p>
          <button className="next-btn" onClick={handleNext}>
            {state.currentStepIndex + 1 < question.steps.length
              ? '次のSTEPへ'
              : state.currentQuestionIndex + 1 < state.questionQueue.length
                ? '次の問題へ'
                : '結果を見る'
            }
          </button>
        </div>
      )}

      {/* 不正解時は短い表示（すぐ解説ページへ遷移する） */}
      {answered && !isCorrect && (
        <div className="feedback feedback-wrong">
          {timedOut && <div className="timeout-badge">タイムアウト！</div>}
          <div className="feedback-header">❌ 不正解</div>
          <p className="feedback-text feedback-text-transition">詳しい解説を表示します…</p>
        </div>
      )}
    </div>
  );
}
