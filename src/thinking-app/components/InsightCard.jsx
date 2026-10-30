import { KINDS, ROLES, promptFor } from '../lib/catalog.js';
import { focusColor, KIND_COLORS } from '../lib/colors.js';
import Icon from './Icon.jsx';

// 注目箇所の見出し（番号・役割・引用）。学習画面と振り返りで使う
export function FocusHead({ focus, index }) {
  return (
    <div className="focus-head" style={{ '--focus': focusColor(index) }}>
      <span className="focus-num">{index + 1}</span>
      <span className="role-tag">{ROLES[focus.role].label}</span>
      <span className="focus-quote">「{focus.quote}」</span>
    </div>
  );
}

// 気づき1つ分。prompt のときは答えの代わりに問いかけを出す（「考えてから見る」）
export function InsightCard({ insight, order, prompt = false }) {
  return (
    <li className={`insight ${prompt ? 'prompt' : ''}`} style={{ '--kind': KIND_COLORS[insight.kind] }}>
      <div className="insight-meta">
        <span className="kind-tag">{KINDS[insight.kind].label}</span>
        {prompt ? (
          <span className="insight-cue prompt-label"><Icon name="bulb" size={14} />考えてみよう</span>
        ) : (
          <span className="insight-cue">「{insight.cue}」と書いてある</span>
        )}
        {order && <span className="sr-only">（{order}個目）</span>}
      </div>
      <p className="insight-thought">
        {prompt ? promptFor(insight) : <><span className="insight-arrow" aria-hidden="true">→</span>{insight.thought}</>}
      </p>
    </li>
  );
}
