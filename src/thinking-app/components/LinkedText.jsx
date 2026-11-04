import { endLabel, splitByMarks } from '../lib/links.js';
import { focusColor } from '../lib/colors.js';

// 板書の文。つながりの語句に印を付けて書き添える
//   語句の側: 中身がわかったら「④ ₃C₂」（わかったところと中身）、まだなら「?」
//   わかる側: 「→ ① あてはまる場合の数」（この中身が入る語句）
//   links: { marks（marksFor() の戻り値）, problem, onJump(index, role), flash（強調中のつながり） }。なければ文をそのまま出す
export default function LinkedText({ text, links }) {
  if (!links || links.marks.length === 0) return text;
  const whole = links.marks.filter(m => m.span === null).flatMap(m => m.ends);
  return (
    <>
      {splitByMarks(text, links.marks).map((seg, k) => (seg.mark ? (
        <LinkPhrase key={k} mark={seg.mark} links={links}>{seg.text}</LinkPhrase>
      ) : seg.text))}
      {whole.map(end => <LinkNote key={end.key} end={end} links={links} />)}
    </>
  );
}

function LinkPhrase({ mark, links, children }) {
  const roles = [...new Set(mark.ends.map(e => e.role))];
  const state = mark.ends.some(e => e.complete) ? 'complete' : 'pending';
  const flash = mark.ends.some(e => e.index === links.flash);
  return (
    <>
      <span
        className={`link-phrase ${roles.join(' ')} ${state} ${flash ? 'flash' : ''}`}
        style={{ '--link': mark.ends[0].color }}
        data-link-end={mark.ends.map(e => e.key).join(' ')}
      >
        {children}
      </span>
      {mark.ends.map(end => <LinkNote key={end.key} end={end} links={links} />)}
    </>
  );
}

function LinkNote({ end, links }) {
  if (end.role === 'term' && !end.complete) {
    return <span className="link-note pending" title="ほかの注目箇所でわかります" aria-label="（ほかの注目箇所でわかる）">?</span>;
  }
  const { problem, onJump, flash } = links;
  const isTerm = end.role === 'term';
  const n = end.other.focusIndex;
  const label = endLabel(problem, end.other);
  return (
    <button
      type="button"
      className={`link-note ${end.role} ${end.index === flash ? 'flash' : ''}`}
      style={{ '--link': end.color, '--focus': focusColor(n) }}
      onClick={() => onJump(end.index, isTerm ? 'source' : 'term')}
      aria-label={isTerm ? `${n + 1}番の「${label}」でわかる（そこへ移動）` : `${n + 1}番の「${label}」の中身になる（そこへ移動）`}
    >
      {!isTerm && <span aria-hidden="true">→</span>}
      <span className="focus-num" aria-hidden="true">{n + 1}</span>
      <span className="link-note-text" aria-hidden="true">{label}</span>
    </button>
  );
}
