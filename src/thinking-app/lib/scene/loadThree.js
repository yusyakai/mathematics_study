// 立体表示・AR の部品（three.js・MindAR）を CDN から必要なときだけ読み込む。
// MindAR が "three" を名前で import するため、thinking/index.html の importmap と同じ版にすること。
const THREE_BASE = 'https://cdn.jsdelivr.net/npm/three@0.160.0';
const MINDAR_BASE = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist';

// 読み込みに失敗したら、次に呼ばれたときにもう一度試す
const once = (load) => {
  let promise = null;
  return () => (promise ??= load().catch(e => {
    promise = null;
    throw e;
  }));
};

export const loadThree = once(() => import(/* @vite-ignore */ `${THREE_BASE}/build/three.module.js`));
export const loadOrbitControls = once(() => import(/* @vite-ignore */ `${THREE_BASE}/examples/jsm/controls/OrbitControls.js`).then(m => m.OrbitControls));
export const loadMindARThree = once(() => import(/* @vite-ignore */ `${MINDAR_BASE}/mindar-image-three.prod.js`).then(m => m.MindARThree));
export const loadMindARCompiler = once(() => import(/* @vite-ignore */ `${MINDAR_BASE}/mindar-image.prod.js`).then(m => m.Compiler));
