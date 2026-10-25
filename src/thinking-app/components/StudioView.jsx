import { useRef, useState } from 'react';
import { thinkingProblems } from '../lib/loadThinking.js';
import { loadDrafts, saveDraft, deleteDraft, newDraftKey, checkDraft } from '../lib/drafts.js';
import { emptyDraft, fromData } from '../lib/serialize.js';
import ProblemItem from './ProblemItem.jsx';

const DATA_SPEC_URL = 'https://github.com/yusyakai/mathematics_study/blob/main/docs/thinking-app/data-spec.md';

// 作成ツールの入口: 下書きの一覧・新規作成・既存の問題や JSON からの作成
export default function StudioView({ onBack, onOpen }) {
  const [drafts, setDrafts] = useState(loadDrafts);
  const [baseId, setBaseId] = useState('');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState(null);
  const fileRef = useRef(null);

  const startEditing = (draft) => {
    const key = newDraftKey();
    saveDraft(key, draft);
    onOpen({ mode: 'editor', draftKey: key });
  };

  const importJson = (text) => {
    try {
      startEditing(fromData(JSON.parse(text)));
    } catch (e) {
      setImportError(`JSONとして読めません: ${e.message}`);
    }
  };

  const remove = (key, title) => {
    if (!window.confirm(`下書き「${title || '（無題）'}」を削除しますか？`)) return;
    deleteDraft(key);
    setDrafts(loadDrafts());
  };

  return (
    <div className="thinking-screen">
      <header className="app-header">
        <button className="back-btn" onClick={onBack} aria-label="戻る">←</button>
        <h2>作成ツール</h2>
      </header>

      <p className="thinking-intro">
        問題文・注目箇所・気づきを入力して、問題データを作ります。下書きはこの端末にだけ保存されます。
        完成したら JSON ファイルに書き出し、リポジトリの <code>src/thinking-app/data/</code> に置くと公開されます。
        各項目の書き方は<a href={DATA_SPEC_URL} target="_blank" rel="noreferrer">データ仕様書</a>を参照してください。
      </p>

      <section className="studio-section">
        <h3>新しく作る</h3>
        <div className="thinking-item-actions">
          <button className="primary" onClick={() => startEditing(emptyDraft())}>＋ 白紙から作る</button>
        </div>
        <div className="studio-row">
          <select value={baseId} onChange={e => setBaseId(e.target.value)} aria-label="もとにする問題">
            <option value="">既存の問題をもとに作る…</option>
            {thinkingProblems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <button
            disabled={!baseId}
            onClick={() => {
              const base = thinkingProblems.find(p => p.id === baseId);
              startEditing(fromData({ ...base, id: `${baseId}_copy`, meta: { ...base.meta, reviewed: false } }));
            }}
          >
            コピーして作る
          </button>
        </div>
        <details className="studio-import">
          <summary>JSON を読み込んで作る（AI が作ったデータの確認にも使えます）</summary>
          <textarea
            value={importText}
            onChange={e => { setImportText(e.target.value); setImportError(null); }}
            placeholder="JSON を貼り付け"
            rows={6}
            aria-label="読み込む JSON"
          />
          <div className="thinking-item-actions">
            <button disabled={!importText.trim()} onClick={() => importJson(importText)}>貼り付けた JSON を読み込む</button>
            <button onClick={() => fileRef.current?.click()}>ファイルを選ぶ</button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async e => {
                const file = e.target.files?.[0];
                if (file) importJson(await file.text());
                e.target.value = '';
              }}
            />
          </div>
          {importError && <p className="form-error" role="alert">{importError}</p>}
        </details>
      </section>

      <section className="studio-section">
        <h3>下書き（この端末）</h3>
        {drafts.length === 0 && <p className="focus-hint">下書きはまだありません。</p>}
        <ul className="thinking-list">
          {drafts.map(({ key, draft, updatedAt }) => {
            const { errors, warnings, problem } = checkDraft(draft);
            const status = errors.length ? `エラー ${errors.length} 件` : warnings.length ? `警告 ${warnings.length} 件` : '問題なし';
            const tools = (
              <div className="draft-meta">
                <span className={errors.length ? 'status-error' : warnings.length ? 'status-warn' : 'status-ok'}>{status}</span>
                <span>更新 {new Date(updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="draft-buttons">
                  <button onClick={() => onOpen({ mode: 'editor', draftKey: key })}>編集</button>
                  <button className="danger" onClick={() => remove(key, draft.title)}>削除</button>
                </span>
              </div>
            );
            return problem ? (
              <ProblemItem key={key} problem={problem} onOpen={onOpen}>{tools}</ProblemItem>
            ) : (
              <li key={key} className="thinking-item">
                <div className="thinking-item-head">
                  <span className="thinking-item-title">{draft.title || '（無題）'}</span>
                </div>
                {tools}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
