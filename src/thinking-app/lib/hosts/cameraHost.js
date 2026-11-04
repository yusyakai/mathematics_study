// 表示先：カメラのAR。スマホのカメラで問題カードを認識し、シーンをカードの上に重ねる。
// MindAR（画像認識AR、無料のOSS）を使う。
import { prepareCard } from '../canvasRender.js';
import { createThinkingScene } from '../scene/thinkingScene.js';
import { loadThree, loadMindARThree, loadMindARCompiler } from '../scene/loadThree.js';
import { StageError } from './errors.js';

const CACHE_NAME = 'thinking-ar-targets-v1';

// カード画像をハッシュ化して、同じカードは認識データを再計算しない
async function cardKey(canvas) {
  const bytes = new TextEncoder().encode(canvas.toDataURL('image/png'));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function compileTarget(canvas, onProgress) {
  let cache = null;
  let key = null;
  try {
    key = `/targets/${await cardKey(canvas)}.mind`;
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(key);
    if (hit) return hit.arrayBuffer();
  } catch {
    // Cache API が使えない環境では毎回計算する
  }

  const Compiler = await loadMindARCompiler();
  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  await img.decode();
  const compiler = new Compiler();
  await compiler.compileImageTargets([img], p => onProgress?.(p));
  const buffer = await compiler.exportData();
  if (cache) await cache.put(key, new Response(buffer)).catch(() => {});
  return buffer;
}

// container に AR を開始する。setView で表示を切り替え、stop で終了する
//   onSelect(focusId): カード上の注目箇所がタップされたとき
//   onTracking(bool) : カードを認識した・見失ったとき
//   signal           : AbortSignal。画面を離れたら準備の途中でも中断する
export async function startCamera({ container, problem, onStatus, onTracking, onSelect, signal }) {
  const checkAborted = () => {
    if (signal?.aborted) throw new StageError('aborted');
  };
  if (!window.isSecureContext) throw new StageError('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw new StageError('unsupported');

  onStatus?.('ARの部品を読み込み中…');
  let THREE;
  let MindARThree;
  try {
    [THREE, MindARThree] = await Promise.all([loadThree(), loadMindARThree()]);
  } catch (e) {
    throw new StageError('load', e);
  }
  checkAborted();

  onStatus?.('カードを準備中…');
  const card = await prepareCard(problem);
  checkAborted();
  let buffer;
  try {
    buffer = await compileTarget(card.canvas, p => onStatus?.(`カードの特徴を解析中… ${Math.round(p)}%`));
  } catch (e) {
    throw new StageError('load', e);
  }
  checkAborted();

  const targetUrl = URL.createObjectURL(new Blob([buffer]));
  // セッションごとに専用の要素を使う（終了時に他のセッションの要素を消さないため）
  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;inset:0;overflow:hidden';
  container.appendChild(root);

  const mindar = new MindARThree({
    container: root,
    imageTargetSrc: targetUrl,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
    filterMinCF: 0.0001,
    filterBeta: 0.001,
  });
  const { renderer, scene, camera } = mindar;
  const anchor = mindar.addAnchor(0);
  anchor.onTargetFound = () => onTracking?.(true);
  anchor.onTargetLost = () => onTracking?.(false);

  // MindAR のアンカーはカード幅 = 1・中心が原点で、シーン部品の座標と同じ
  const content = createThinkingScene({ THREE, problem, card, showCard: false, layout: 'above', action: 'タップ' });
  anchor.group.add(content.group);

  // タップした位置をカード上の座標に変換して、注目箇所を判定する
  const raycaster = new THREE.Raycaster();
  const onPointer = (e) => {
    if (!anchor.group.visible) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const id = content.pick(raycaster);
    if (id) onSelect?.(id);
  };
  root.addEventListener('pointerup', onPointer);

  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    root.removeEventListener('pointerup', onPointer);
    renderer.setAnimationLoop(null);
    // mindar.stop() は起動途中で失敗したときに例外になるため、同じ処理を個別に行う
    try {
      mindar.controller?.stopProcessVideo();
    } catch {
      // 認識処理が始まっていない
    }
    mindar.video?.srcObject?.getTracks().forEach(t => t.stop());
    mindar.video?.remove();
    renderer.dispose();
    renderer.forceContextLoss(); // 表示を何度も切り替えても WebGL の上限数に達しないよう、すぐ手放す
    content.dispose();
    URL.revokeObjectURL(targetUrl);
    root.remove();
  };

  onStatus?.('カメラを起動中…');
  try {
    await mindar.start();
  } catch (e) {
    cleanup();
    throw new StageError('camera', e);
  }
  if (signal?.aborted) {
    cleanup();
    throw new StageError('aborted');
  }
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
  onStatus?.(null);

  return { setView: (view) => content.setView(view), stop: cleanup };
}
