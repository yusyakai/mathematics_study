// スマホのカメラで問題カードを認識し、注目箇所と気づきを重ねて表示する
// MindAR（画像認識AR、無料のOSS）と three.js は CDN から必要なときだけ読み込む。
// MindAR が "three" を名前で import するため、index.html の importmap と同じURLを使うこと。
import {
  CARD_W, CARD_H, BUBBLE_W, ensureFonts, renderCard, renderHighlight, renderBubble, hitTestFocus,
} from './canvasRender';
import { focusColor } from './loadThinking';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const MINDAR_URL = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
const MINDAR_THREE_URL = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
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

  const { Compiler } = await import(/* @vite-ignore */ MINDAR_URL);
  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  await img.decode();
  const compiler = new Compiler();
  await compiler.compileImageTargets([img], p => onProgress?.(p));
  const buffer = await compiler.exportData();
  if (cache) await cache.put(key, new Response(buffer)).catch(() => {});
  return buffer;
}

export async function prepareCard(problem) {
  await ensureFonts(problem);
  return renderCard(problem);
}

// container に AR を開始する。setState で表示を切り替え、stop で終了する
// onSelect(focusId): カード上の注目箇所がタップされたとき
export async function startAR({ container, problem, onStatus, onTracking, onSelect }) {
  onStatus?.('ライブラリを読み込み中…');
  const [THREE, { MindARThree }] = await Promise.all([
    import(/* @vite-ignore */ THREE_URL),
    import(/* @vite-ignore */ MINDAR_THREE_URL),
  ]);

  onStatus?.('カードを準備中…');
  const card = await prepareCard(problem);
  const buffer = await compileTarget(card.canvas, p => onStatus?.(`カードの特徴を解析中… ${Math.round(p)}%`));
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

  // MindAR の座標: カード幅 = 1、中心が原点
  const cardH = CARD_H / CARD_W;
  const toCard = (px, py, z = 0) => new THREE.Vector3(px / CARD_W - 0.5, (CARD_H / 2 - py) / CARD_W, z);

  const disposables = [];
  const texturePlane = (canvas, width, height) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const geometry = new THREE.PlaneGeometry(width, height);
    disposables.push(texture, material, geometry);
    return { mesh: new THREE.Mesh(geometry, material), texture };
  };

  const highlightCanvas = document.createElement('canvas');
  highlightCanvas.width = CARD_W;
  highlightCanvas.height = CARD_H;
  const highlight = texturePlane(highlightCanvas, 1, cardH);
  highlight.mesh.position.z = 0.002;
  anchor.group.add(highlight.mesh);

  // 開いている注目箇所の吹き出し（カードの上に少し手前へ浮かべ、注目箇所から線でつなぐ）
  // 気づきが1個増えるたびに描き直す
  const bubbleScale = 0.9 / BUBBLE_W;
  const bubbleBottom = new THREE.Vector3(0, cardH / 2 + 0.05, 0.1);
  const lineGeometry = new THREE.CylinderGeometry(0.004, 0.004, 1, 8);
  const lineMaterial = new THREE.MeshBasicMaterial();
  const line = new THREE.Mesh(lineGeometry, lineMaterial);
  line.visible = false;
  anchor.group.add(line);
  disposables.push(lineGeometry, lineMaterial);
  let bubble = null; // { key, mesh, dispose }

  const updateBubble = (state) => {
    const index = problem.focuses.findIndex(f => f.id === state.activeId);
    const count = index >= 0 ? (state.revealed[state.activeId] ?? 0) : 0;
    const key = count > 0 ? `${state.activeId}:${count}` : null;
    if (bubble?.key === key) return;
    if (bubble) {
      anchor.group.remove(bubble.mesh);
      bubble.dispose();
      bubble = null;
    }
    line.visible = false;
    if (!key) return;

    const canvas = renderBubble(problem, index, count);
    const h = canvas.height * bubbleScale;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const geometry = new THREE.PlaneGeometry(BUBBLE_W * bubbleScale, h);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, bubbleBottom.y + h / 2, bubbleBottom.z);
    anchor.group.add(mesh);
    bubble = { key, mesh, dispose: () => [texture, material, geometry].forEach(d => d.dispose()) };

    const r = card.focuses[index].rects[0];
    const start = toCard(r.x + r.w / 2, r.y, 0.004);
    line.position.copy(start).add(bubbleBottom).multiplyScalar(0.5);
    line.scale.y = start.distanceTo(bubbleBottom);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bubbleBottom.clone().sub(start).normalize());
    lineMaterial.color.set(focusColor(index));
    line.visible = true;
  };

  const setState = (state) => {
    renderHighlight(highlightCanvas, card.focuses, state);
    highlight.texture.needsUpdate = true;
    updateBubble(state);
  };

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
    const hit = raycaster.intersectObject(highlight.mesh)[0];
    if (!hit?.uv) return;
    const id = hitTestFocus(card.focuses, hit.uv.x * CARD_W, (1 - hit.uv.y) * CARD_H);
    if (id) onSelect?.(id);
  };
  root.addEventListener('pointerup', onPointer);

  onStatus?.('カメラを起動中…');
  await mindar.start();
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
  onStatus?.(null);

  return {
    setState,
    stop() {
      root.removeEventListener('pointerup', onPointer);
      renderer.setAnimationLoop(null);
      mindar.stop();
      renderer.dispose();
      bubble?.dispose();
      disposables.forEach(d => d.dispose());
      URL.revokeObjectURL(targetUrl);
      root.remove();
    },
  };
}
