import { useApp } from '../contexts/AppContext';
import { SUBJECTS, DIFFICULTIES } from '../data/categories';
import MathText from './MathText';

export default function ExplanationScreen() {
  const { state, dispatch } = useApp();
  const { question, failedStepIndex, selectedIndex, stepResults } = state.explanationData;

  const failedStep = question.steps[failedStepIndex];
  const userChoice = selectedIndex >= 0 ? failedStep.choices[selectedIndex] : null;
  const correctChoice = failedStep.choices[failedStep.correct];

  return (
    <div className="explanation-screen">
      <div className="explanation-header">
        <div className="explanation-badge">詳細解説</div>
        <h1>{question.title}</h1>
        <div className="explanation-meta">
          <span style={{ color: SUBJECTS[question.subject]?.color }}>
            {SUBJECTS[question.subject]?.label}
          </span>
          <span>{question.unit}</span>
          <span style={{ color: DIFFICULTIES[question.difficulty]?.color }}>
            {DIFFICULTIES[question.difficulty]?.label}
          </span>
        </div>
      </div>

      {/* 問題文 */}
      <div className="explanation-problem">
        <h2>問題</h2>
        <p><MathText text={question.problem} /></p>
      </div>

      {/* 正解したSTEPの振り返り */}
      {stepResults.length > 0 && (
        <div className="explanation-section">
          <h2>正解したSTEP</h2>
          {stepResults.slice(0, failedStepIndex).map((result, i) => {
            const s = question.steps[i];
            return (
              <div key={i} className="explanation-step-ok">
                <div className="explanation-step-label">STEP {i + 1} ⭕</div>
                <p className="explanation-step-q"><MathText text={s.question} /></p>
                <p className="explanation-step-a">→ <MathText text={s.choices[s.correct]} /></p>
              </div>
            );
          })}
        </div>
      )}

      {/* 間違えたSTEP（メイン解説） */}
      <div className="explanation-section explanation-main">
        <h2>間違えたSTEP（STEP {failedStepIndex + 1}）</h2>

        <div className="explanation-q-block">
          <p className="explanation-step-q"><MathText text={failedStep.question} /></p>
        </div>

        <div className="explanation-answer-compare">
          <div className="explanation-your-answer">
            <div className="explanation-label wrong-label">あなたの回答</div>
            <p><MathText text={userChoice || 'タイムアウト（未回答）'} /></p>
          </div>
          <div className="explanation-correct-answer">
            <div className="explanation-label correct-label">正解</div>
            <p><MathText text={correctChoice} /></p>
          </div>
        </div>

        <div className="explanation-detail">
          <h3>なぜ間違いなのか</h3>
          <p><MathText text={failedStep.explanation_wrong} /></p>
        </div>

        <div className="explanation-detail correct-detail">
          <h3>正しい考え方</h3>
          <p><MathText text={failedStep.explanation_correct} /></p>
        </div>

        {/* 全選択肢の解説 */}
        <div className="explanation-all-choices">
          <h3>各選択肢の解説</h3>
          {failedStep.choices.map((choice, i) => (
            <div
              key={i}
              className={`explanation-choice-item ${i === failedStep.correct ? 'is-correct' : ''} ${i === selectedIndex ? 'is-selected' : ''}`}
            >
              <span className="explanation-choice-marker">
                {i === failedStep.correct ? '⭕' : '✕'}
              </span>
              <span><MathText text={choice} /></span>
              {i === selectedIndex && i !== failedStep.correct && (
                <span className="your-pick">← あなたの回答</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 残りのSTEP（まだ解いていない部分のプレビュー） */}
      {failedStepIndex + 1 < question.steps.length && (
        <div className="explanation-section">
          <h2>この先のSTEP（参考）</h2>
          {question.steps.slice(failedStepIndex + 1).map((s, i) => (
            <div key={i} className="explanation-step-preview">
              <div className="explanation-step-label">
                STEP {failedStepIndex + 2 + i}
              </div>
              <p className="explanation-step-q"><MathText text={s.question} /></p>
              <p className="explanation-step-a">正解: <MathText text={s.choices[s.correct]} /></p>
              <p className="explanation-step-hint"><MathText text={s.explanation_correct} /></p>
            </div>
          ))}
        </div>
      )}

      {/* アクション */}
      <div className="explanation-actions">
        <button
          className="menu-btn primary"
          onClick={() => dispatch({ type: 'CONTINUE_AFTER_EXPLANATION' })}
        >
          <span className="menu-btn-icon">▶</span>
          {state.currentQuestionIndex + 1 < state.questionQueue.length
            ? '次の問題へ進む'
            : '結果を見る'
          }
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
