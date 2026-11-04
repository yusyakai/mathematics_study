// 学習画面の表示のしかた。学習の進み具合は表示を切り替えても引き継ぐ。
// 将来スマートグラスに対応するときは、ここに表示を1つ追加し、lib/hosts/ に表示先を作る。
import { readStore, STORE_KEYS } from './storage.js';

export const DISPLAYS = [
  { key: 'scene', label: '立体', description: '画面の中に問題カードと吹き出しを立体的に表示します' },
  { key: 'text', label: '文字', description: '問題文と気づきを文字だけで表示します' },
  { key: 'camera', label: 'カメラ', description: 'スマホのカメラで問題カードを映して表示します' },
];

// 「画面で見る」で使う表示（前回選んだ「立体」か「文字」。初めては立体）
export const preferredDisplay = () => (readStore(STORE_KEYS.display, 'scene') === 'text' ? 'text' : 'scene');
