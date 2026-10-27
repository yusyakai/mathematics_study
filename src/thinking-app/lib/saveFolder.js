// 作成ツールで書き出す JSON を、選んだフォルダに直接保存する（ブラウザのファイル システム アクセス API）。
// PC の Chrome・Edge で使える。使えないブラウザでは、これまでどおりダウンロードで保存する。
// 選んだフォルダは IndexedDB に覚えておき、次に開いたときも使う（ブラウザを開き直すと、保存時に許可の確認が1回出る）。

const DB_NAME = 'chakugan';
const STORE = 'handles';
const KEY = 'saveFolder';

export const canPickFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

// IndexedDB の小さな読み書き（使えない環境では何もしない）
function withStore(mode, fn) {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE);
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction(STORE, mode);
          const request = fn(tx.objectStore(STORE));
          tx.oncomplete = () => resolve(request?.result ?? null);
          tx.onerror = () => resolve(null);
          tx.onabort = () => resolve(null);
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

// 前に選んだ保存先フォルダ（なければ null）
export const loadSaveFolder = () => withStore('readonly', store => store.get(KEY));

// 保存先フォルダを選んで覚える。選ぶのをやめたら null
export async function pickSaveFolder() {
  try {
    const handle = await window.showDirectoryPicker({ id: 'chakugan-data', mode: 'readwrite' });
    await withStore('readwrite', store => store.put(handle, KEY));
    return handle;
  } catch (e) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}

// 書き込みの許可を確かめる（ブラウザを開き直した後は、ここで確認が出る）
async function ensureWritable(handle) {
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission?.(opts)) === 'granted') return true;
  return (await handle.requestPermission?.(opts)) === 'granted';
}

async function fileExists(folder, name) {
  try {
    await folder.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
}

// フォルダにファイルを保存する。
//   confirmOverwrite(name): 同じ名前のファイルがあるとき、上書きしてよいかを返す
// 戻り値: 'saved' | 'cancelled'（上書きしない） | 'denied'（許可されなかった）
export async function saveToFolder(folder, name, text, confirmOverwrite) {
  if (!(await ensureWritable(folder))) return 'denied';
  if ((await fileExists(folder, name)) && !confirmOverwrite(name)) return 'cancelled';
  const file = await folder.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
  return 'saved';
}
