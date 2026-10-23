import { TRIGGER_COLORS } from '../../thinking/loadThinking';

// 表示段階の説明と「戻る／次へ」ボタン
export default function StepControls({ problem, steps, step, setStep }) {
  const current = steps[step];
  return (
    <div className="step-controls">
      <div className="step-caption">
        <span className="step-count">{step + 1} / {steps.length}</span>
        {current.kind === 'triggers' ? (
          <ol className="step-triggers">
            {problem.triggers.map((t, i) => (
              <li key={t.id}>
                <span className="trigger-dot" style={{ background: TRIGGER_COLORS[i % TRIGGER_COLORS.length] }}>{i + 1}</span>
                {t.note}
              </li>
            ))}
          </ol>
        ) : (
          <p>{current.caption}</p>
        )}
        {current.note && <p className="step-note">{current.note}</p>}
      </div>
      <div className="step-buttons">
        <button disabled={step === 0} onClick={() => setStep(step - 1)}>戻る</button>
        <button
          className="primary"
          onClick={() => setStep(step === steps.length - 1 ? 0 : step + 1)}
        >
          {step === steps.length - 1 ? '最初から' : '次へ'}
        </button>
      </div>
    </div>
  );
}
