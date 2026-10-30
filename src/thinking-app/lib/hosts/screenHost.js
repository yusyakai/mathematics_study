// 表示先：PC・スマホの画面。カメラを使わず、問題カードと吹き出しを画面の中の立体空間に置く。
// AR と同じシーン部品を使うので、見え方はカメラやスマートグラスで見たときと同じになる。
//   ・注目箇所はクリック／タップで選ぶ（透明なボタンを重ねるので、キーボードや読み上げでも選べる）
//   ・ドラッグで傾ける、ホイール／ピンチで拡大縮小、右ドラッグ／2本指で移動
//   ・画面の縦横比に合わせて、吹き出しをカードの上か右に置く
import { prepareCard } from '../canvasRender.js';
import { ROLES } from '../catalog.js';
import { createThinkingScene } from '../scene/thinkingScene.js';
import { chooseLayout, fitDistance, boxCenter } from '../scene/layout.js';
import { loadThree, loadOrbitControls } from '../scene/loadThree.js';
import { StageError } from './errors.js';

const FOV = 35; // カメラの縦の視野角（度）
const TAP_MOVE = 8; // これより動いたらタップではなくドラッグとみなす（px）

// container に立体表示を開始する。setView で表示を切り替え、resetView で視点を戻し、stop で終了する
//   onSelect(focusId): 注目箇所が選ばれたとき
//   signal           : AbortSignal。画面を離れたら準備の途中でも中断する
export async function startScreen({ container, problem, onStatus, onSelect, signal }) {
  const checkAborted = () => {
    if (signal?.aborted) throw new StageError('aborted');
  };

  onStatus?.('立体表示を準備中…');
  let THREE;
  let OrbitControls;
  try {
    [THREE, OrbitControls] = await Promise.all([loadThree(), loadOrbitControls()]);
  } catch (e) {
    throw new StageError('load', e);
  }
  checkAborted();
  const card = await prepareCard(problem);
  checkAborted();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    throw new StageError('webgl', e);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // セッションごとに専用の要素を使う（終了時に他のセッションの要素を消さないため）
  const root = document.createElement('div');
  root.className = 'scene-root';
  const targetLayer = document.createElement('div');
  targetLayer.className = 'scene-targets';
  root.append(renderer.domElement, targetLayer);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', `問題カード「${problem.title}」の立体表示`);
  container.appendChild(root);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 50);
  const action = window.matchMedia?.('(pointer: fine)').matches ? 'クリック' : 'タップ';
  const content = createThinkingScene({ THREE, problem, card, showCard: true, action });
  scene.add(content.group);

  // 傾けすぎて読めなくならないよう、回転の範囲を絞る
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.screenSpacePanning = true;
  controls.rotateSpeed = 0.6;
  controls.minAzimuthAngle = -0.6;
  controls.maxAzimuthAngle = 0.6;
  controls.minPolarAngle = Math.PI / 2 - 0.5;
  controls.maxPolarAngle = Math.PI / 2 + 0.5;

  // 注目箇所に重ねる透明なボタン（行ごとに1つ。2行目以降は読み上げで重複しないようにする）
  let shown = false;
  const targets = content.focusTargets().map((t, i) => {
    const focus = problem.focuses[i];
    const buttons = t.rects.map((corners, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'scene-target';
      b.hidden = true;
      if (k === 0) b.setAttribute('aria-label', `${i + 1}番 ${ROLES[focus.role].label}「${focus.quote}」を選ぶ`);
      else {
        b.tabIndex = -1;
        b.setAttribute('aria-hidden', 'true');
      }
      b.addEventListener('click', () => onSelect?.(t.id));
      targetLayer.appendChild(b);
      return { b, corners };
    });
    return { id: t.id, buttons };
  });

  const size = { w: 1, h: 1 };
  const point = new THREE.Vector3();
  const placeTargets = () => {
    content.group.updateMatrixWorld();
    for (const t of targets) {
      for (const { b, corners } of t.buttons) {
        b.hidden = !shown;
        if (!shown) continue;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const c of corners) {
          point.copy(c).applyMatrix4(content.group.matrixWorld).project(camera);
          const x = ((point.x + 1) / 2) * size.w;
          const y = ((1 - point.y) / 2) * size.h;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
        b.style.left = `${minX}px`;
        b.style.top = `${minY}px`;
        b.style.width = `${maxX - minX}px`;
        b.style.height = `${maxY - minY}px`;
      }
    }
  };

  // 必要なときだけ描く（操作がないときは電池を使わない）
  let frame = 0;
  const render = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      renderer.render(scene, camera);
      placeTargets();
    });
  };
  controls.addEventListener('change', render);

  // 画面の大きさに合わせて配置を選び、全体が収まる位置にカメラを置く
  const fit = () => {
    const aspect = size.w / size.h;
    content.setLayout(chooseLayout(aspect, content.cardH, content.sizes(), FOV));
    const box = content.contentBox();
    const center = boxCenter(box);
    const distance = fitDistance(box, FOV, aspect);
    camera.position.set(center.x, center.y, distance);
    controls.target.set(center.x, center.y, 0);
    controls.minDistance = distance * 0.35;
    controls.maxDistance = distance * 2;
    controls.update();
    render();
  };

  const resize = () => {
    size.w = Math.max(1, container.clientWidth);
    size.h = Math.max(1, container.clientHeight);
    renderer.setSize(size.w, size.h);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    fit();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // カードの上をクリック／タップしたとき（透明なボタンの少し外側でも、近い注目箇所を選ぶ）
  const raycaster = new THREE.Raycaster();
  let down = null;
  const onDown = (e) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e) => {
    if (!down || !shown || Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_MOVE) return;
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    ), camera);
    const id = content.pick(raycaster);
    if (id) onSelect?.(id);
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  const stop = () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    renderer.domElement.removeEventListener('pointerdown', onDown);
    renderer.domElement.removeEventListener('pointerup', onUp);
    controls.dispose();
    content.dispose();
    renderer.dispose();
    renderer.forceContextLoss(); // 表示を何度も切り替えても WebGL の上限数に達しないよう、すぐ手放す
    root.remove();
  };
  if (signal?.aborted) {
    stop();
    throw new StageError('aborted');
  }
  onStatus?.(null);

  return {
    setView(view) {
      shown = view.shown;
      content.setView(view);
      render();
    },
    resetView: fit,
    stop,
  };
}
