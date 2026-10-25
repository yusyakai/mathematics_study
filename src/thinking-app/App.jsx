import { useEffect, useRef, useState } from 'react';
import { thinkingProblems, invalidThinking } from './lib/loadThinking.js';
import { SUBJECTS } from './lib/catalog.js';
import { readStore, STORE_KEYS } from './lib/storage.js';
import Thinking2DView from './components/Thinking2DView.jsx';
import ThinkingARView from './components/ThinkingARView.jsx';
import ThinkingCardView from './components/ThinkingCardView.jsx';
import SummaryView from './components/SummaryView.jsx';
import StudioView from './components/StudioView.jsx';
import EditorView from './components/EditorView.jsx';
import ProblemItem from './components/ProblemItem.jsx';

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

// 着眼点トレーナー: 問題一覧と各画面を切り替える
export default function App() {
  const { view, open, replace, back } = useScreens();
  const { problem } = view;
  const toSummary = () => replace({ mode: 'summary', problem });

  switch (view.mode) {
    case '2d':
      return <Thinking2DView key={view.uid} problem={problem} onBack={back} onSummary={toSummary} />;
    case 'ar':
      return (
        <ThinkingARView
          key={view.uid}
          problem={problem}
          onBack={back}
          onFallback={() => replace({ mode: '2d', problem })}
          onSummary={toSummary}
        />
      );
    case 'card':
      return <ThinkingCardView key={view.uid} problem={problem} onBack={back} />;
    case 'summary':
      return <SummaryView key={view.uid} problem={problem} onBack={back} onRetry={() => replace({ mode: '2d', problem })} />;
    case 'studio':
      return <StudioView key={view.uid} onBack={back} onOpen={open} />;
    case 'editor':
      return <EditorView key={view.uid} draftKey={view.draftKey} onBack={back} onOpen={open} />;
    default:
      return <ListScreen onOpen={open} />;
  }
}

function ListScreen({ onOpen }) {
  const [completed] = useState(() => readStore(STORE_KEYS.completed, {}));
  const [subject, setSubject] = useState(null);
  const subjects = Object.keys(SUBJECTS).filter(s => thinkingProblems.some(p => p.subject === s));
  const problems = subject ? thinkingProblems.filter(p => p.subject === subject) : thinkingProblems;

  return (
    <div className="thinking-screen">
      <header className="app-header">
        <h1>着眼点トレーナー</h1>
      </header>

      <p className="thinking-intro">
        問題文のどこから見るか、そこに書いてあることから何を考えるかを、注目箇所ごとに1つずつ表示します。
        ARで見るときは、問題カードを印刷するかPCの画面に表示し、スマホのカメラを向けてください。
      </p>

      {subjects.length > 1 && (
        <div className="subject-filter" role="group" aria-label="科目で絞り込む">
          <button className={subject === null ? 'active' : ''} aria-pressed={subject === null} onClick={() => setSubject(null)}>すべて</button>
          {subjects.map(s => (
            <button key={s} className={subject === s ? 'active' : ''} aria-pressed={subject === s} onClick={() => setSubject(s)}>{s}</button>
          ))}
        </div>
      )}

      <ul className="thinking-list">
        {problems.map(p => (
          <ProblemItem key={p.id} problem={p} completedAt={completed[p.id]} onOpen={onOpen} />
        ))}
      </ul>

      {invalidThinking.length > 0 && (
        <details className="thinking-invalid">
          <summary>読み込めなかったデータ {invalidThinking.length} 件</summary>
          {invalidThinking.map(f => (
            <div key={f.file}>
              <strong>{f.file}</strong>
              <ul>{f.errors.map(e => <li key={e}>{e}</li>)}</ul>
            </div>
          ))}
        </details>
      )}

      <footer className="app-footer">
        <button className="link-button" onClick={() => onOpen({ mode: 'studio' })}>問題データを作る（作成ツール）</button>
      </footer>
    </div>
  );
}
