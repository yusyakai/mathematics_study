// 作成中の下書き（この端末の localStorage にだけ保存する）
// 公開するには、作成ツールから JSON を書き出して src/thinking-app/data/ に置く
import { readStore, writeStore, STORE_KEYS } from './storage.js';
import { validateThinking } from './schema.js';
import { normalizeProblem } from './model.js';
import { fromData, toData } from './serialize.js';

// 保存されている内容が壊れていても扱えるよう、読み込むときに形を整える
export function loadDrafts() {
  return Object.entries(readStore(STORE_KEYS.drafts, {}))
    .map(([key, entry]) => ({ key, draft: fromData(entry?.draft), updatedAt: entry?.updatedAt }))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export function loadDraft(key) {
  const entry = readStore(STORE_KEYS.drafts, {})[key];
  return entry ? fromData(entry.draft) : null;
}

export function saveDraft(key, draft) {
  const all = readStore(STORE_KEYS.drafts, {});
  all[key] = { draft, updatedAt: new Date().toISOString() };
  writeStore(STORE_KEYS.drafts, all);
}

export function deleteDraft(key) {
  const all = readStore(STORE_KEYS.drafts, {});
  delete all[key];
  writeStore(STORE_KEYS.drafts, all);
}

export const newDraftKey = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// 下書きを検証し、問題なければ画面で使える形にする
export function checkDraft(draft) {
  const data = toData(draft);
  const { errors, warnings } = validateThinking(data);
  return { data, errors, warnings, problem: errors.length ? null : { ...normalizeProblem(data), draft: true } };
}
