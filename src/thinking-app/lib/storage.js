// 端末内の保存（localStorage）。設定・学習の完了記録・作成中の下書きだけを保存する。
// プライベートブラウズなどで使えない場合もあるので、失敗しても画面は動くようにする。
import { useCallback, useState } from 'react';

const PREFIX = 'chakugan.';

export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 保存できなくても続行する
  }
}

// localStorage と同期する state
export function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStore(key, fallback));
  const update = useCallback((next) => {
    setValue(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      writeStore(key, resolved);
      return resolved;
    });
  }, [key]);
  return [value, update];
}

export const STORE_KEYS = {
  settings: 'settings.v1', // { promptFirst: boolean }
  completed: 'completed.v1', // { [problemId]: 完了日時のISO文字列 }
  drafts: 'drafts.v1', // { [draftId]: 作成中のデータ }
};
