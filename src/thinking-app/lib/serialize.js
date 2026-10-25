// 作成ツールの入力内容と、保存するデータ (JSON) の変換（純粋な関数）
import { SCHEMA_VERSION } from './schema.js';
import { SUBJECTS } from './catalog.js';

const firstSubject = Object.keys(SUBJECTS)[1]; // 数学I
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

// 新しく作るときの初期値
export function emptyDraft() {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: '',
    title: '',
    subject: firstSubject,
    unit: SUBJECTS[firstSubject][0],
    difficulty: 'C',
    problem: '',
    origin: '',
    focuses: [],
    meta: { source: 'manual', model: '', reviewed: false },
  };
}

// 読み込んだデータを作成ツールで扱える形にする（足りない項目は初期値で補う）
export function fromData(data) {
  const base = emptyDraft();
  const d = data && typeof data === 'object' ? data : {};
  const byPriority = (a, b) => (a?.priority ?? 0) - (b?.priority ?? 0);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: d.id ?? base.id,
    title: d.title ?? base.title,
    subject: d.subject ?? base.subject,
    unit: d.unit ?? base.unit,
    difficulty: d.difficulty ?? base.difficulty,
    problem: d.problem ?? base.problem,
    origin: d.origin ?? base.origin,
    focuses: (Array.isArray(d.focuses) ? [...d.focuses].sort(byPriority) : []).map(f => ({
      id: f?.id ?? '',
      quote: f?.quote ?? '',
      occurrence: f?.occurrence ?? 1,
      role: f?.role ?? 'condition',
      insights: (Array.isArray(f?.insights) ? [...f.insights].sort(byPriority) : []).map(s => ({
        kind: s?.kind ?? 'interpret',
        cue: s?.cue ?? '',
        thought: s?.thought ?? '',
      })),
    })),
    meta: { ...base.meta, ...(d.meta && typeof d.meta === 'object' ? d.meta : {}), model: d.meta?.model ?? '' },
  };
}

// 作成ツールの内容を保存用のデータにする。優先順位は並び順から振り直し、空の任意項目は省く
export function toData(draft) {
  const data = {
    schemaVersion: SCHEMA_VERSION,
    id: str(draft.id).trim(),
    title: str(draft.title).trim(),
    subject: draft.subject,
    unit: draft.unit,
    difficulty: draft.difficulty,
    problem: str(draft.problem),
  };
  if (str(draft.origin).trim()) data.origin = str(draft.origin).trim();
  data.focuses = draft.focuses.map((f, i) => {
    const focus = { id: str(f.id), quote: str(f.quote) };
    if (f.occurrence && f.occurrence !== 1) focus.occurrence = f.occurrence;
    focus.role = f.role;
    focus.priority = i + 1;
    focus.insights = f.insights.map((s, j) => ({ priority: j + 1, kind: s.kind, cue: str(s.cue), thought: str(s.thought).trim() }));
    return focus;
  });
  data.meta = { source: draft.meta.source };
  if (draft.meta.source === 'ai' && str(draft.meta.model).trim()) data.meta.model = str(draft.meta.model).trim();
  data.meta.reviewed = Boolean(draft.meta.reviewed);
  return data;
}

// 手書きのデータファイルと同じ体裁の JSON 文字列にする（気づき・meta は1行にまとめる）
export function formatJson(data) {
  const s = JSON.stringify;
  const inline = (obj) => `{ ${Object.entries(obj).map(([k, v]) => `${s(k)}: ${s(v)}`).join(', ')} }`;
  const { focuses = [], meta = {}, ...head } = data;
  const focusBlocks = focuses.map(f => {
    const { insights = [], ...rest } = f;
    const lines = Object.entries(rest).map(([k, v]) => `      ${s(k)}: ${s(v)}`);
    const insightLines = insights.map(x => `        ${inline(x)}`);
    lines.push(insightLines.length ? `      "insights": [\n${insightLines.join(',\n')}\n      ]` : '      "insights": []');
    return `    {\n${lines.join(',\n')}\n    }`;
  });
  const lines = Object.entries(head).map(([k, v]) => `  ${s(k)}: ${s(v)}`);
  lines.push(focusBlocks.length ? `  "focuses": [\n${focusBlocks.join(',\n')}\n  ]` : '  "focuses": []');
  lines.push(`  "meta": ${inline(meta)}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}

// 問題文の中で quote が何回目に出てくる位置か（start より前の出現数 + 1）
export function occurrenceAt(problem, quote, start) {
  let count = 0;
  let pos = problem.indexOf(quote);
  while (pos !== -1 && pos < start) {
    count++;
    pos = problem.indexOf(quote, pos + 1);
  }
  return count + 1;
}

// 問題文の中で quote が何回出てくるか
export function countOccurrences(problem, quote) {
  if (!quote) return 0;
  let count = 0;
  for (let pos = problem.indexOf(quote); pos !== -1; pos = problem.indexOf(quote, pos + 1)) count++;
  return count;
}

// まだ使われていない注目箇所ID（f1, f2, ...）
export function nextFocusIdFor(draft) {
  const used = new Set(draft.focuses.map(f => f.id));
  let n = 1;
  while (used.has(`f${n}`)) n++;
  return `f${n}`;
}
