import { useRef, useState } from 'react';
import { thinkingProblems } from '../lib/loadThinking.js';
import { loadDrafts, saveDraft, deleteDraft, newDraftKey, checkDraft } from '../lib/drafts.js';
import { emptyDraft, fromData, extractJson } from '../lib/serialize.js';
import { buildAiPrompt } from '../lib/aiPrompt.js';
import ProblemItem from './ProblemItem.jsx';
import Icon from './Icon.jsx';

const DATA_SPEC_URL = 'https://github.com/yusyakai/mathematics_study/blob/main/docs/thinking-app/data-spec.md';

// 作成ツールの入口: 下書きの一覧・新規作成・既存の問題や JSON からの作成
export default function StudioView({ onBack, onOpen }) {
  const [drafts, setDrafts] = useState(loadDrafts);
  const [baseId, setBaseId] = useState('');
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState(null);
  const [aiProblem, setAiProblem] = useState('');
  const [promptNotice, setPromptNotice] = useState(null);
  const [promptShown, setPromptShown] = useState(false);
  const fileRef = useRef(null);

  const startEditing = (draft) => {
    const key = newDraftKey();
    saveDraft(key, draft);
    onOpen({ mode: 'editor', draftKey: key });
  };

  const importJson = (text) => {
    try {
      startEditing(fromData(JSON.parse(extractJson(text))));
    } catch (e) {
      setImportError(`JSONとして読めません: ${e.message}`);
    }
  };

  const prompt = buildAiPrompt(aiProblem.trim() || undefined);
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setPromptNotice('指示文をコピーしました。AI チャットに貼り付けて送ってください。');
      setPromptShown(false);
    } catch {
      setPromptNotice('コピーできませんでした。下の指示文を選択してコピーしてください。');
      setPromptShown(true);
    }
  };

  const remove = (key, title) => {
    if (!window.confirm(`下書き「${title || '（無題）'}」を削除しますか？`)) return;
    deleteDraft(key);
    setDrafts(loadDrafts());
  };

  return (
    <div className="screen studio-view">
      <header className="app-bar">
        <div className="app-bar-inner">
          <button className="icon-btn" onClick={onBack} aria-label="戻る"><Icon name="back" size={20} /></button>
          <div className="app-bar-title">
            <h2>作成ツール</h2>
            <p>問題データを作る</p>
          </div>
        </div>
      </header>

      <main className="page">
        <p className="lead">
          問題文・注目箇所・気づきを入力して、問題データを作ります。下書きはこの端末にだけ保存されます。
          完成したら JSON ファイルに書き出し、リポジトリの <code>src/thinking-app/data/</code> に置くと公開されます。
          各項目の書き方は<a href={DATA_SPEC_URL} target="_blank" rel="noreferrer">データ仕様書</a>を参照してください。
        </p>

        <section className="panel">
          <h3 className="panel-title"><Icon name="plus" size={18} />新しく作る</h3>
          <button className="btn primary block" onClick={() => startEditing(emptyDraft())}>白紙から作る</button>
          <div className="field-row">
            <select value={baseId} onChange={e => setBaseId(e.target.value)} aria-label="もとにする問題">
              <option value="">既存の問題をもとに作る…</option>
              {thinkingProblems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button
              className="btn"
              disabled={!baseId}
              onClick={() => {
                const base = thinkingProblems.find(p => p.id === baseId);
                startEditing(fromData({ ...base, id: `${baseId}_copy`, meta: { ...base.meta, reviewed: false } }));
              }}
            >
              コピーして作る
            </button>
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title"><Icon name="sparkles" size={18} />AI に下書きを作ってもらう</h3>
          <ol className="steps">
            <li>問題文を入れて「AI用の指示文をコピー」を押す（空のままでもよく、あとで指示文の最後に問題文を貼れます）</li>
            <li>Claude などの AI チャットに貼り付けて送る</li>
            <li>AI が出した JSON を、下の「JSON を読み込んで作る」に貼り付けて読み込む（前後の説明文はそのままでかまいません）</li>
            <li>作成方法「AI生成」と「未確認」は自動で入ります。使った AI のモデル名を入れ、内容を確認してから「内容を確認した」にチェックする</li>
          </ol>
          <textarea
            className="input"
            value={aiProblem}
            onChange={e => { setAiProblem(e.target.value); setPromptNotice(null); }}
            placeholder="問題文（任意）"
            rows={3}
            aria-label="AI に渡す問題文"
          />
          <div className="btn-row">
            <button className="btn primary" onClick={copyPrompt}><Icon name="copy" size={16} />AI用の指示文をコピー</button>
            <button className="btn" onClick={() => setPromptShown(v => !v)}>{promptShown ? '指示文を閉じる' : '指示文を見る'}</button>
          </div>
          {promptNotice && <p className="notice" role="status">{promptNotice}</p>}
          {promptShown && <textarea className="input mono" readOnly value={prompt} rows={14} aria-label="AI用の指示文" />}
          <details className="disclosure" open>
            <summary>JSON を読み込んで作る（AI が作った JSON はここに貼り付け）</summary>
            <textarea
              className="input mono"
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportError(null); }}
              placeholder="JSON を貼り付け"
              rows={6}
              aria-label="読み込む JSON"
            />
            <div className="btn-row">
              <button className="btn" disabled={!importText.trim()} onClick={() => importJson(importText)}>貼り付けた JSON を読み込む</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} />ファイルを選ぶ</button>
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
            {importError && <p className="notice error" role="alert">{importError}</p>}
          </details>
        </section>

        <section className="studio-drafts">
          <h3 className="section-heading">下書き（この端末）</h3>
          {drafts.length === 0 && <p className="empty">下書きはまだありません。</p>}
          <ul className="problem-grid">
            {drafts.map(({ key, draft, updatedAt }) => {
              const { errors, warnings, problem } = checkDraft(draft);
              const status = errors.length ? `エラー ${errors.length} 件` : warnings.length ? `警告 ${warnings.length} 件` : '問題なし';
              const tools = (
                <div className="draft-meta">
                  <span className={`tag ${errors.length ? 'error' : warnings.length ? 'warn' : 'ok'}`}>{status}</span>
                  <span>更新 {new Date(updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="draft-buttons">
                    <button className="btn sm" onClick={() => onOpen({ mode: 'editor', draftKey: key })}><Icon name="pencil" size={14} />編集</button>
                    <button className="btn sm danger" onClick={() => remove(key, draft.title)}>削除</button>
                  </span>
                </div>
              );
              return problem ? (
                <ProblemItem key={key} problem={problem} onOpen={onOpen}>{tools}</ProblemItem>
              ) : (
                <li key={key} className="problem-card">
                  <h3 className="problem-title">{draft.title || '（無題）'}</h3>
                  {tools}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
