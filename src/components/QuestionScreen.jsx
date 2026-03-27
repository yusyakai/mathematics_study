import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';

export default function QuestionScreen() {
  const { state, dispatch, questions } = useApp();
  const [answered, setAnswered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [timeLeft, setTimeLeft] = useState(state.timerMode ? 5 : null);
  const [timedOut, setTimedOut] = useState(false);

  const qIdx = state.questionQueue[state.currentQuestionIndex];
  const question = questions[qIdx];
  const step = question.steps[state.currentStepIndex];
  const isCorrect = selectedIndex === step.correct;

  // Timer logic
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

  // Handle timeout
  useEffect(() => {
    if (state.timerMode && timeLeft === 0 && !answered) {
      setTimedOut(true);
      handleAnswer(-1); // -1 = timed out (always wrong)
    }
  }, [timeLeft]);

  const handleAnswer = useCallback((index) => {
    if (answered) return;
    setSelectedIndex(index);
    setAnswered(true);
    dispatch({ type: 'ANSWER_STEP', selectedIndex: index });
  }, [answered, dispatch]);

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
          <span className="step-indicator">
            STEP {state.currentStepIndex + 1} / {question.steps.length}
          </span>
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
        {step.choices.map((choice, i) => {
          let className = 'choice-btn';
          if (answered) {
            if (i === step.correct) className += ' correct';
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

      {answered && (
        <div className={`feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}>
          {timedOut && (
            <div className="timeout-badge">タイムアウト！</div>
          )}
          <div className="feedback-header">
            {isCorrect ? '⭕ 正解！' : '❌ 不正解'}
          </div>
          <p className="feedback-text">
            {isCorrect ? step.explanation_correct : step.explanation_wrong}
          </p>
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
    </div>
  );
}
