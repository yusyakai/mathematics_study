import { useEffect, useMemo, useRef, useState } from 'react';
import { SUBJECTS, DIFFICULTIES, ROLES, KINDS, KIND_DECISION_STEPS, SOURCES } from '../lib/catalog.js';
import { LIMITS, locateQuote } from '../lib/schema.js';
import { focusColor, KIND_COLORS } from '../lib/colors.js';
import { loadDraft, saveDraft, checkDraft } from '../lib/drafts.js';
import { emptyDraft, formatJson, occurrenceAt, countOccurrences, nextFocusIdFor } from '../lib/serialize.js';
import { canPickFolder, loadSaveFolder, pickSaveFolder, saveToFolder } from '../lib/saveFolder.js';
import Icon from './Icon.jsx';

// 「求めよ」などを含む引用は「問い」として追加する（あとで変更できる）
const QUESTION_PATTERN = /求めよ|示せ|証明せよ|答えよ|調べよ/;

const moveItem = (list, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

// 問題データの作成・編集。入力内容はこの端末に自動保存し、その場で検証する
export default function EditorView({ draftKey, onBack, onOpen }) {
  const [draft, setDraft] = useState(() => loadDraft(draftKey) ?? emptyDraft());
  const savedRef = useRef(null); // 最後に保存した内容（開いただけでは更新日時を変えない）
  const [selection, setSelection] = useState(null); // 問題文で選択中の範囲 { start, end }
  const [manualQuote, setManualQuote] = useState('');
  const [notice, setNotice] = useState(null); // 注目箇所を追加できなかった理由
  const [exportNotice, setExportNotice] = useState(null);
  const [saveFolder, setSaveFolder] = useState(null); // JSON を直接保存するフォルダ（Chrome・Edge）
  const problemRef = useRef(null);
  const checkRef = useRef(null); // チェック結果（ヘッダーの札から移動する）

  useEffect(() => {
    const text = JSON.stringify(draft);
    if (savedRef.current === null) savedRef.current = JSON.stringify(loadDraft(draftKey));
    if (text === savedRef.current) return;
    saveDraft(draftKey, draft);
    savedRef.current = text;
  }, [draftKey, draft]);

  useEffect(() => {
    if (!canPickFolder()) return;
    let cancelled = false;
    loadSaveFolder().then(folder => {
      if (!cancelled && folder) setSaveFolder(folder);
    });
    return () => { cancelled = true; };
  }, []);

  const check = useMemo(() => checkDraft(draft), [draft]);
  const json = useMemo(() => formatJson(check.data), [check]);

  // 問題文の中で選択した範囲を覚えておく（スマホではボタンを押すと選択が外れることがあるため）
  useEffect(() => {
    const onSelectionChange = () => {
      const el = problemRef.current;
      const sel = document.getSelection();
      if (!el || !sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return;
      const before = range.cloneRange();
      before.selectNodeContents(el);
      before.setEnd(range.startContainer, range.startOffset);
      const start = before.toString().length;
      const text = range.toString();
      setSelection(text.trim() ? { start, end: start + text.length } : null);
      if (text.trim()) setNotice(null);
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  const update = (patch) => setDraft(d => ({ ...d, ...patch }));
  const updateFocuses = (fn) => setDraft(d => ({ ...d, focuses: fn(d.focuses) }));
  const updateFocus = (i, fn) => updateFocuses(fs => fs.map((f, k) => (k === i ? fn(f) : f)));
  const updateMeta = (patch) => setDraft(d => ({ ...d, meta: { ...d.meta, ...patch } }));

  // [start, end) と重なる既存の注目箇所
  const findOverlap = (start, end) => draft.focuses.find(f => {
    const span = locateQuote(draft.problem, f.quote, f.occurrence || 1);
    return span && span[0] < end && start < span[1];
  });

  const addFocus = (quote, start) => {
    const overlap = findOverlap(start, start + quote.length);
    if (overlap) {
      setNotice(`注目箇所「${overlap.quote}」と重なっています。重ならない範囲を選んでください。`);
      return;
    }
    setDraft(d => ({
      ...d,
      focuses: [...d.focuses, {
        id: nextFocusIdFor(d),
        quote,
        occurrence: occurrenceAt(d.problem, quote, start),
        role: QUESTION_PATTERN.test(quote) ? 'question' : 'condition',
        insights: [{ kind: 'interpret', cue: quote, thought: '' }],
      }],
    }));
    setNotice(null);
  };

  const addFromSelection = () => {
    if (!selection) return;
    const raw = draft.problem.slice(selection.start, selection.end);
    const quote = raw.trim();
    addFocus(quote, selection.start + (raw.length - raw.trimStart().length));
    setSelection(null);
    document.getSelection()?.removeAllRanges();
  };

  // 入力した引用は、既存の注目箇所と重ならない最初の出現を使う
  const addFromInput = () => {
    const quote = manualQuote.trim();
    let start = draft.problem.indexOf(quote);
    if (start === -1) {
      setNotice(`「${quote}」が問題文に見つかりません。空白や記号も問題文と同じにしてください。`);
      return;
    }
    while (start !== -1 && findOverlap(start, start + quote.length)) start = draft.problem.indexOf(quote, start + 1);
    if (start === -1) start = draft.problem.indexOf(quote); // すべて重なる場合は理由を表示する
    addFocus(quote, start);
    if (!findOverlap(start, start + quote.length)) setManualQuote('');
  };

  const removeFocus = (i) => {
    const f = draft.focuses[i];
    if (f.insights.some(s => s.thought.trim()) && !window.confirm(`注目箇所「${f.quote}」と、その気づきを削除しますか？`)) return;
    updateFocuses(fs => fs.filter((_, k) => k !== i));
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setExportNotice('JSON をコピーしました。');
    } catch {
      setExportNotice('コピーできませんでした。「JSON を表示」から選択してコピーしてください。');
    }
  };

  const fileName = `${check.data.id || 'problem'}.json`;

  const downloadJson = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 保存先フォルダを選ぶ（選んだフォルダは次回も使う）
  const chooseFolder = async () => {
    try {
      const folder = await pickSaveFolder();
      if (folder) setSaveFolder(folder);
      return folder;
    } catch (e) {
      setExportNotice(`フォルダを選べませんでした（${e.message}）。「ダウンロード」で保存してください。`);
      return null;
    }
  };

  // 選んだフォルダに直接保存する（まだ選んでいなければ先に選ぶ）
  const saveIntoFolder = async () => {
    const folder = saveFolder ?? await chooseFolder();
    if (!folder) return;
    try {
      const result = await saveToFolder(folder, fileName, json, name => window.confirm(`「${name}」はすでにあります。上書きしますか？`));
      setExportNotice({
        saved: `「${folder.name}」フォルダに ${fileName} を保存しました。`,
        cancelled: '保存をやめました。',
        denied: 'フォルダへの保存が許可されませんでした。もう一度保存するか、保存先を選び直してください。',
      }[result]);
    } catch (e) {
      setExportNotice(`保存できませんでした（${e.message}）。「ダウンロード」で保存してください。`);
    }
  };

  const selectedText = selection ? draft.problem.slice(selection.start, selection.end).trim() : '';
  const units = SUBJECTS[draft.subject] ?? [];

  const status = check.errors.length
    ? { tone: 'error', label: `エラー ${check.errors.length} 件` }
    : check.warnings.length ? { tone: 'warn', label: `警告 ${check.warnings.length} 件` } : { tone: 'ok', label: '問題なし' };

  return (
    <div className="screen editor-view">
      <header className="app-bar">
        <div className="app-bar-inner">
          <button className="icon-btn" onClick={onBack} aria-label="戻る"><Icon name="back" size={20} /></button>
          <div className="app-bar-title">
            <h2>問題データを作る</h2>
            <p>この端末に自動保存</p>
          </div>
          <button className={`tag ${status.tone} status-link`} onClick={() => checkRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            {status.label}
          </button>
        </div>
      </header>

      <main className="page">
        <section className="panel">
          <h3 className="panel-title"><span className="step-num">1</span>問題の基本情報</h3>
          <label className="field">題名
            <input value={draft.title} onChange={e => update({ title: e.target.value })} placeholder="例: 確率 基本" />
          </label>
          <label className="field">ID（ファイル名になります）
            <input value={draft.id} onChange={e => update({ id: e.target.value })} placeholder="例: probability_002" autoCapitalize="off" spellCheck="false" />
            <span className="field-help">半角英小文字・数字・_ だけ。ほかの問題と重ならない名前にします。</span>
          </label>
          <div className="field-grid">
            <label className="field">科目
              <select value={draft.subject} onChange={e => update({ subject: e.target.value, unit: SUBJECTS[e.target.value][0] })}>
                {Object.keys(SUBJECTS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="field">単元
              <select value={draft.unit} onChange={e => update({ unit: e.target.value })}>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="field">難易度
              <select value={draft.difficulty} onChange={e => update({ difficulty: e.target.value })}>
                {Object.entries(DIFFICULTIES).map(([k, v]) => <option key={k} value={k}>{k}：{v.label}</option>)}
              </select>
              <span className="field-help">{DIFFICULTIES[draft.difficulty]?.description}</span>
            </label>
          </div>
          <label className="field">出典（任意）
            <input value={draft.origin} onChange={e => update({ origin: e.target.value })} placeholder="例: 自作、教科書p.52 例題3" />
          </label>
          <label className="field">問題文
            <textarea
              value={draft.problem}
              onChange={e => { update({ problem: e.target.value }); setSelection(null); }}
              rows={4}
              placeholder="問題文をそのまま入力"
            />
          </label>
        </section>

        <section className="panel">
          <h3 className="panel-title"><span className="step-num">2</span>注目箇所と気づき</h3>
          <p className="field-help">
            問題文の中をドラッグ（スマホは長押し）して範囲を選び、「注目箇所に追加」を押します。
            上にあるものほど優先順位が高く、表示する番号になります。
          </p>
          <details className="disclosure classify-guide">
            <summary>役割と種類の選び方</summary>
            <p className="field-help">注目箇所の役割（その部分に何が書かれているか）</p>
            <ul>
              {Object.values(ROLES).map(r => <li key={r.label}><strong>{r.label}</strong>：{r.description}</li>)}
            </ul>
            <p className="field-help">気づきの種類（迷ったら上から順に確かめ、最初に当てはまったものにする）</p>
            <ol>
              {KIND_DECISION_STEPS.map(step => <li key={step.kind}><strong>{KINDS[step.kind].label}</strong>：{step.question}</li>)}
            </ol>
            <p className="field-help">1つの気づきには1つの考えだけを書きます。読み取り → 解法の選択のように種類の違う考えが続くときは、気づきを分けて優先順位で並べます。</p>
          </details>
          {draft.problem.trim() ? (
            <div ref={problemRef} className="editor-problem problem-text">
              <ProblemWithFocuses problem={draft.problem} focuses={draft.focuses} />
            </div>
          ) : (
            <p className="empty">先に問題文を入力してください。</p>
          )}
          <button className="btn primary block" disabled={!selectedText} onClick={addFromSelection}>
            {selectedText ? `「${selectedText.length > 16 ? `${selectedText.slice(0, 16)}…` : selectedText}」を注目箇所に追加` : '範囲を選ぶと注目箇所に追加できます'}
          </button>
          <div className="field-row">
            <input className="input" value={manualQuote} onChange={e => setManualQuote(e.target.value)} placeholder="または、問題文の一部を入力して追加" aria-label="注目箇所にする引用" />
            <button className="btn" disabled={!manualQuote.trim()} onClick={addFromInput}>追加</button>
          </div>
          {notice && <p className="notice" role="status">{notice}</p>}

          <ol className="editor-focuses">
            {draft.focuses.map((f, i) => (
              <FocusEditor
                key={i}
                focus={f}
                index={i}
                total={draft.focuses.length}
                problem={draft.problem}
                onChange={fn => updateFocus(i, fn)}
                onMove={dir => updateFocuses(fs => moveItem(fs, i, dir))}
                onRemove={() => removeFocus(i)}
              />
            ))}
          </ol>
        </section>

        <section className="panel">
          <h3 className="panel-title"><span className="step-num">3</span>管理情報</h3>
          <div className="field-grid">
            <label className="field">作成方法
              <select value={draft.meta.source} onChange={e => updateMeta({ source: e.target.value })}>
                {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            {draft.meta.source === 'ai' && (
              <label className="field">使用したAIモデル
                <input value={draft.meta.model} onChange={e => updateMeta({ model: e.target.value })} placeholder="例: claude-opus-5-5" />
              </label>
            )}
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={draft.meta.reviewed} onChange={e => updateMeta({ reviewed: e.target.checked })} />
            内容を確認した（チェックするまで一覧に「未確認」と表示されます）
          </label>
        </section>

        <section className="panel" ref={checkRef} aria-live="polite">
          <h3 className="panel-title"><span className="step-num">4</span>チェック結果</h3>
          {check.errors.length === 0 && check.warnings.length === 0 && (
            <p className="notice ok"><Icon name="check" size={16} />問題ありません。</p>
          )}
          {check.errors.length > 0 && (
            <ul className="check-list errors">
              {check.errors.map(e => <li key={e}>エラー：{e}</li>)}
            </ul>
          )}
          {check.warnings.length > 0 && (
            <ul className="check-list warnings">
              {check.warnings.map(w => <li key={w}>警告：{w}</li>)}
            </ul>
          )}
        </section>

        <section className="panel">
          <h3 className="panel-title"><span className="step-num">5</span>確認と書き出し</h3>
          <div className="btn-row">
            <button className="btn" disabled={!check.problem} onClick={() => onOpen({ mode: 'learn', problem: check.problem })}><Icon name="eye" size={16} />画面で確認</button>
            <button className="btn" disabled={!check.problem} onClick={() => onOpen({ mode: 'card', problem: check.problem })}><Icon name="card" size={16} />カード</button>
          </div>
          {!check.problem && <p className="field-help">エラーがなくなると確認できます。</p>}
          {canPickFolder() ? (
            <>
              <button className="btn primary block" onClick={saveIntoFolder}>
                <Icon name="folder" size={16} />
                {saveFolder ? `「${saveFolder.name}」フォルダに保存` : '保存先フォルダを選んで保存'}
              </button>
              <p className="field-help">
                {saveFolder ? (
                  <>保存先：{saveFolder.name}（<button className="link-button" onClick={chooseFolder}>変更する</button>）</>
                ) : '一度選んだフォルダは次回も使います。'}
              </p>
              <div className="btn-row">
                <button className="btn" onClick={copyJson}><Icon name="copy" size={16} />JSON をコピー</button>
                <button className="btn" onClick={downloadJson}><Icon name="download" size={16} />ダウンロード</button>
              </div>
            </>
          ) : (
            <>
              <div className="btn-row">
                <button className="btn" onClick={copyJson}><Icon name="copy" size={16} />JSON をコピー</button>
                <button className="btn primary" onClick={downloadJson}><Icon name="download" size={16} />ファイルに保存</button>
              </div>
              <p className="field-help">
                このブラウザでは、ダウンロードフォルダに保存されます。保存先のフォルダを選んで保存するには、PC の Chrome か Edge で開いてください。
              </p>
            </>
          )}
          {exportNotice && <p className="notice" role="status">{exportNotice}</p>}
          <details className="disclosure">
            <summary>JSON を表示</summary>
            <textarea className="input mono" readOnly value={json} rows={14} aria-label="書き出す JSON" />
          </details>
          <p className="field-help">
            公開するには、保存したファイル（{check.data.id || 'ID'}.json）を GitHub のリポジトリの
            <code>src/thinking-app/data</code> フォルダに「Add file → Upload files」で追加します。
            {check.errors.length > 0 && ' エラーが残っていると、公開しても一覧に表示されません。'}
          </p>
        </section>
      </main>
    </div>
  );
}

// 問題文に注目箇所の範囲と番号を重ねて表示する。
// 番号は CSS の ::before で出すので、選択範囲の文字位置は問題文と一致する
function ProblemWithFocuses({ problem, focuses }) {
  const spans = focuses
    .map((f, i) => ({ i, span: locateQuote(problem, f.quote, f.occurrence || 1) }))
    .filter(x => x.span)
    .sort((a, b) => a.span[0] - b.span[0]);
  const parts = [];
  let pos = 0;
  for (const { i, span } of spans) {
    if (span[0] < pos) continue;
    parts.push(problem.slice(pos, span[0]));
    parts.push(
      <span key={i} className="editor-focus" data-num={i + 1} style={{ '--focus': focusColor(i) }}>
        {problem.slice(span[0], span[1])}
      </span>
    );
    pos = span[1];
  }
  parts.push(problem.slice(pos));
  return parts;
}

// 手がかりの語句の候補（引用全体と、空白・読点などで区切った部分）
const cueSuggestions = (quote) => [...new Set([quote, ...quote.split(/[\s、，,。()（）]+/)].filter(Boolean))];

function FocusEditor({ focus, index, total, problem, onChange, onMove, onRemove }) {
  const occurrences = countOccurrences(problem, focus.quote);
  const updateInsights = (fn) => onChange(f => ({ ...f, insights: fn(f.insights) }));
  const updateInsight = (j, patch) => updateInsights(list => list.map((s, k) => (k === j ? { ...s, ...patch } : s)));
  const listId = `cues-${index}`;

  return (
    <li className="editor-focus-card" style={{ '--focus': focusColor(index) }}>
      <div className="editor-row">
        <span className="focus-num">{index + 1}</span>
        <input
          className="grow"
          value={focus.quote}
          onChange={e => onChange(f => ({ ...f, quote: e.target.value, occurrence: 1 }))}
          aria-label={`注目箇所${index + 1}の引用`}
        />
        <span className="row-buttons">
          <button onClick={() => onMove(-1)} disabled={index === 0} aria-label="優先順位を上げる"><Icon name="chevronUp" size={16} /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} aria-label="優先順位を下げる"><Icon name="chevronDown" size={16} /></button>
          <button className="danger" onClick={onRemove} aria-label="注目箇所を削除"><Icon name="close" size={16} /></button>
        </span>
      </div>
      {occurrences > 1 && (
        <label className="field-inline">問題文に {occurrences} 回出てくるうちの
          <select value={focus.occurrence || 1} onChange={e => onChange(f => ({ ...f, occurrence: Number(e.target.value) }))}>
            {Array.from({ length: occurrences }, (_, k) => <option key={k} value={k + 1}>{k + 1} 番目</option>)}
          </select>
        </label>
      )}
      <label className="field-inline">役割
        <select value={focus.role} onChange={e => onChange(f => ({ ...f, role: e.target.value }))}>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span className="field-help">{ROLES[focus.role]?.description}</span>
      </label>

      <datalist id={listId}>
        {cueSuggestions(focus.quote).map(c => <option key={c} value={c} />)}
      </datalist>
      <ol className="editor-insights">
        {focus.insights.map((s, j) => {
          const cueError = s.cue && !focus.quote.includes(s.cue);
          const length = [...s.thought].length;
          return (
            <li key={j} className="editor-insight" style={{ '--kind': KIND_COLORS[s.kind] }}>
              <div className="editor-row">
                <span className="editor-index">{j + 1}</span>
                <select value={s.kind} onChange={e => updateInsight(j, { kind: e.target.value })} aria-label="気づきの種類">
                  {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <input
                  className="grow"
                  value={s.cue}
                  list={listId}
                  onChange={e => updateInsight(j, { cue: e.target.value })}
                  placeholder="手がかりの語句"
                  aria-label="手がかりの語句（注目箇所の一部）"
                />
                <span className="row-buttons">
                  <button onClick={() => updateInsights(list => moveItem(list, j, -1))} disabled={j === 0} aria-label="気づきを上へ"><Icon name="chevronUp" size={16} /></button>
                  <button onClick={() => updateInsights(list => moveItem(list, j, 1))} disabled={j === focus.insights.length - 1} aria-label="気づきを下へ"><Icon name="chevronDown" size={16} /></button>
                  <button className="danger" onClick={() => updateInsights(list => list.filter((_, k) => k !== j))} aria-label="気づきを削除"><Icon name="close" size={16} /></button>
                </span>
              </div>
              <p className="field-help">{KINDS[s.kind]?.description}</p>
              {cueError && <p className="field-error">手がかりの語句は、注目箇所の引用「{focus.quote}」の一部にしてください。</p>}
              <textarea
                value={s.thought}
                onChange={e => updateInsight(j, { thought: e.target.value })}
                rows={2}
                placeholder="そこから考えること（1文で）"
                aria-label="考えること"
              />
              <p className={`char-count ${length > LIMITS.thoughtLength ? 'over' : ''}`}>{length} / {LIMITS.thoughtLength} 字</p>
            </li>
          );
        })}
      </ol>
      <button
        className="btn ghost block add-insight"
        onClick={() => updateInsights(list => [...list, { kind: 'interpret', cue: focus.quote, thought: '' }])}
      >
        <Icon name="plus" size={16} />気づきを追加
      </button>
    </li>
  );
}
