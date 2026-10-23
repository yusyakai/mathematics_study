// スマホのカメラで問題カードを認識し、注目箇所と思考ノードを重ねて表示する
// MindAR（画像認識AR、無料のOSS）と three.js は CDN から必要なときだけ読み込む。
// MindAR が "three" を名前で import するため、index.html の importmap と同じURLを使うこと。
import {
  CARD_W, CARD_H, ensureFonts, renderCard, renderHighlight, layoutPanel, renderPanel,
} from './canvasRender';
import { TRIGGER_COLORS } from './loadThinking';

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

// container に AR を開始する。戻り値の setStep で表示段階を切り替え、stop で終了する
export async function startAR({ container, problem, onStatus, onTracking }) {
  onStatus?.('ライブラリを読み込み中…');
  const [THREE, { MindARThree }] = await Promise.all([
    import(/* @vite-ignore */ THREE_URL),
    import(/* @vite-ignore */ MINDAR_THREE_URL),
  ]);

  onStatus?.('カードを準備中…');
  const card = await prepareCard(problem);
  const buffer = await compileTarget(card.canvas, p => onStatus?.(`カードの特徴を解析中… ${Math.round(p)}%`));
  const targetUrl = URL.createObjectURL(new Blob([buffer]));

  const mindar = new MindARThree({
    container,
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

  // 思考ノードのパネルはカードの上に少し手前へ浮かべる
  const layout = layoutPanel(problem);
  const panelCanvas = document.createElement('canvas');
  panelCanvas.width = layout.width;
  panelCanvas.height = layout.height;
  const panelH = layout.height / layout.width;
  const panelY = cardH / 2 + 0.06 + panelH / 2;
  const panelZ = 0.12;
  const panel = texturePlane(panelCanvas, 1, panelH);
  panel.mesh.position.set(0, panelY, panelZ);
  anchor.group.add(panel.mesh);

  // 注目箇所 → 思考ノードを結ぶ線（3D）
  const links = [];
  const lineGeometry = new THREE.CylinderGeometry(0.004, 0.004, 1, 8);
  disposables.push(lineGeometry);
  card.triggers.forEach((t, i) => {
    const r = t.rects[0];
    if (!r) return;
    const start = toCard(r.x + r.w / 2, r.y, 0.004);
    const material = new THREE.MeshBasicMaterial({ color: TRIGGER_COLORS[i % TRIGGER_COLORS.length] });
    disposables.push(material);
    for (const n of problem.thoughts) {
      if (!n.from.includes(t.id)) continue;
      const box = layout.nodes[n.id];
      const end = new THREE.Vector3(
        (box.x + box.w / 2) / layout.width - 0.5,
        panelY + (layout.height / 2 - (box.y + box.h)) / layout.width,
        panelZ,
      );
      const mesh = new THREE.Mesh(lineGeometry, material);
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.scale.y = start.distanceTo(end);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
      mesh.visible = false;
      anchor.group.add(mesh);
      links.push({ mesh, thoughtId: n.id });
    }
  });

  const setVisible = (visible) => {
    renderHighlight(highlightCanvas, card.triggers, visible);
    renderPanel(panelCanvas, problem, layout, visible);
    highlight.texture.needsUpdate = true;
    panel.texture.needsUpdate = true;
    links.forEach(l => { l.mesh.visible = visible.triggers && visible.thoughtIds.has(l.thoughtId); });
  };

  onStatus?.('カメラを起動中…');
  await mindar.start();
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
  onStatus?.(null);

  return {
    setVisible,
    stop() {
      renderer.setAnimationLoop(null);
      mindar.stop();
      renderer.dispose();
      disposables.forEach(d => d.dispose());
      URL.revokeObjectURL(targetUrl);
      container.replaceChildren();
    },
  };
}
