import { KINDS, ROLES, promptFor } from '../lib/catalog.js';
import { focusColor, KIND_COLORS } from '../lib/colors.js';
import { wholeKeys } from '../lib/links.js';
import LinkedText from './LinkedText.jsx';
import Icon from './Icon.jsx';

// 注目箇所の見出し（番号・役割・引用）。学習画面と振り返りで使う
//   links: 引用に付けるつながりの印（LinkedText を参照）
export function FocusHead({ focus, index, links = null }) {
  return (
    <div className="focus-head" style={{ '--focus': focusColor(index) }}>
      <span className="focus-num">{index + 1}</span>
      <span className="role-tag">{ROLES[focus.role].label}</span>
      <span className="focus-quote" data-link-end={wholeKeys(links?.marks)}>「<LinkedText text={focus.quote} links={links} />」</span>
    </div>
  );
}

// 気づき1つ分。prompt のときは答えの代わりに問いかけを出す（「考えてから見る」）
//   links: 考えること（thought）に付けるつながりの印（LinkedText を参照）
export function InsightCard({ insight, order, prompt = false, links = null }) {
  return (
    <li
      className={`insight ${prompt ? 'prompt' : ''}`}
      style={{ '--kind': KIND_COLORS[insight.kind] }}
      data-link-end={prompt ? undefined : wholeKeys(links?.marks)}
    >
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
        {prompt ? promptFor(insight) : <><span className="insight-arrow" aria-hidden="true">→</span><LinkedText text={insight.thought} links={links} /></>}
      </p>
    </li>
  );
}
