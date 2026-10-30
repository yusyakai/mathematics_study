import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { thinkingProblems, invalidThinking } from './lib/loadThinking.js';
import { SUBJECTS } from './lib/catalog.js';
import { readStore, STORE_KEYS } from './lib/storage.js';
import { sortProblems, nextProblem } from './lib/model.js';
import { preferredDisplay } from './lib/display.js';
import LearnView from './components/LearnView.jsx';
import ThinkingCardView from './components/ThinkingCardView.jsx';
import SummaryView from './components/SummaryView.jsx';
import StudioView from './components/StudioView.jsx';
import EditorView from './components/EditorView.jsx';
import ProblemItem from './components/ProblemItem.jsx';
import Icon, { Logo } from './components/Icon.jsx';

// 画面の移動を履歴として持ち、スマホの「戻る」操作でも1つ前の画面に戻れるようにする
function useScreens() {
  const uid = useRef(0);
  const [stack, setStack] = useState(() => [{ mode: 'list', uid: 0 }]);

  useEffect(() => {
    const onPop = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return {
    view: stack[stack.length - 1],
    open: (next) => {
      window.history.pushState(null, '');
      setStack(s => [...s, { ...next, uid: ++uid.current }]);
    },
    replace: (next) => setStack(s => [...s.slice(0, -1), { ...next, uid: ++uid.current }]),
    back: () => window.history.back(),
  };
}

// 一覧の並び（科目・単元の順）。振り返りの「次の問題へ」もこの順で選ぶ
const orderedProblems = sortProblems(thinkingProblems);
// 一覧は科目ごとにまとめる（単元は各カードに出す）
const groups = Object.keys(SUBJECTS)
  .map(subject => ({ subject, problems: orderedProblems.filter(p => p.subject === subject) }))
  .filter(g => g.problems.length > 0);

// 着眼点トレーナー: 問題一覧と各画面を切り替える
//   learn の display: 'scene'（立体）| 'text'（文字）| 'camera'（カメラ）
export default function App() {
  const { view, open, replace, back } = useScreens();
  const { problem } = view;

  switch (view.mode) {
    case 'learn':
      return (
        <LearnView
          key={view.uid}
          problem={problem}
          initialDisplay={view.display ?? preferredDisplay()}
          onBack={back}
          onSummary={() => replace({ mode: 'summary', problem })}
        />
      );
    case 'card':
      return <ThinkingCardView key={view.uid} problem={problem} onBack={back} />;
    case 'summary': {
      const next = problem.draft ? null : nextProblem(orderedProblems, problem.id, readStore(STORE_KEYS.completed, {}));
      return (
        <SummaryView
          key={view.uid}
          problem={problem}
          next={next}
          onBack={back}
          onRetry={() => replace({ mode: 'learn', problem })}
          onNext={() => replace({ mode: 'learn', problem: next })}
        />
      );
    }
    case 'studio':
      return <StudioView key={view.uid} onBack={back} onOpen={open} />;
    case 'editor':
      return <EditorView key={view.uid} draftKey={view.draftKey} onBack={back} onOpen={open} />;
    default:
      return <ListScreen onOpen={open} />;
  }
}

// 一覧に戻ったとき、絞り込みとスクロール位置を元に戻す（問題が増えても続きから選べるように）
const listMemory = { subject: null, scrollY: 0 };

function ListScreen({ onOpen: openScreen }) {
  const [completed] = useState(() => readStore(STORE_KEYS.completed, {}));
  const [subject, setSubjectState] = useState(listMemory.subject);
  const setSubject = (next) => {
    listMemory.subject = next;
    setSubjectState(next);
  };
  const onOpen = (next) => {
    listMemory.scrollY = window.scrollY;
    openScreen(next);
  };
  useLayoutEffect(() => {
    window.scrollTo(0, listMemory.scrollY);
  }, []);
  const shown = subject ? groups.filter(g => g.subject === subject) : groups;
  const doneCount = thinkingProblems.filter(p => completed[p.id]).length;
  const total = thinkingProblems.length;

  return (
    <div className="screen list-view">
      <header className="app-bar">
        <div className="app-bar-inner">
          <h1 className="brand"><Logo size={30} />着眼点トレーナー</h1>
          <button className="btn ghost sm" onClick={() => onOpen({ mode: 'studio' })}>
            <Icon name="pencil" size={16} />作成ツール
          </button>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <p className="hero-title">問題文の<em>どこを見て</em>、<em>何を考えるか</em>。</p>
          <p className="hero-text">注目箇所を番号の順にたどり、そこに書いてあることからの気づきを1つずつ確かめます。</p>
          {total > 0 && (
            <div className="hero-progress">
              <div className="meter" role="progressbar" aria-label="完了した問題" aria-valuemin={0} aria-valuemax={total} aria-valuenow={doneCount}>
                <span style={{ width: `${(doneCount / total) * 100}%` }} />
              </div>
              <span className="hero-progress-text">完了 <strong>{doneCount}</strong> / {total} 問</span>
            </div>
          )}
        </section>

        {groups.length > 1 && (
          <div className="filter-chips" role="group" aria-label="科目で絞り込む">
            <button className={subject === null ? 'active' : ''} aria-pressed={subject === null} onClick={() => setSubject(null)}>
              すべて<span className="chip-count">{total}</span>
            </button>
            {groups.map(g => (
              <button key={g.subject} className={subject === g.subject ? 'active' : ''} aria-pressed={subject === g.subject} onClick={() => setSubject(g.subject)}>
                {g.subject}<span className="chip-count">{g.problems.length}</span>
              </button>
            ))}
          </div>
        )}

        {shown.map(g => (
          <section key={g.subject} className="problem-group">
            <h2 className="group-title">
              {g.subject}<span className="group-count">{g.problems.length} 問</span>
            </h2>
            <ul className="problem-grid">
              {g.problems.map(p => (
                <ProblemItem key={p.id} problem={p} completedAt={completed[p.id]} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        ))}

        {total === 0 && <p className="empty">まだ問題がありません。作成ツールで問題データを作ってください。</p>}

        {invalidThinking.length > 0 && (
          <details className="notice error invalid-data">
            <summary>読み込めなかったデータ {invalidThinking.length} 件</summary>
            {invalidThinking.map(f => (
              <div key={f.file}>
                <strong>{f.file}</strong>
                <ul>{f.errors.map(e => <li key={e}>{e}</li>)}</ul>
              </div>
            ))}
          </details>
        )}
      </main>
    </div>
  );
}
