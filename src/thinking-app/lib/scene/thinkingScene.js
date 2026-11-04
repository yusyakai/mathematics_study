// 問題カード・注目箇所のハイライト・吹き出し・線をまとめた three.js のシーン部品。
// 表示先（画面の立体表示・カメラのAR・将来のスマートグラス）に依存しないようにし、
// 表示先は group を置く場所とカメラ・操作の扱いだけを受け持つ。
import { CARD_W, CARD_H, BUBBLE_W, renderHighlight, renderBubble } from '../canvasRender.js';
import { focusColor } from '../colors.js';
import { hitTestFocus } from '../geometry.js';
import { SCENE, bubbleCenter, connectorPathPx, lineEnd, contentBox } from './layout.js';

// 線はカードの面のすぐ上、ハイライト（番号の丸など）の下に置く。番号の丸が線の上に重なって見える
const LINE_Z = 0.001;
const LINE_RADIUS = 0.004;
const HIGHLIGHT_Z = LINE_Z + LINE_RADIUS + 0.001; // 線の太さより上

// view（表示の状態）: { shown, activeId, nextId, focus: { [id]: { opened, revealed } }, cueSpan }
//
// THREE   : 読み込み済みの three.js
// card    : prepareCard() の戻り値
// showCard: カードの画像も表示するか（画面表示は true、AR は実物のカードがあるので false）
// action  : 吹き出しに出す操作の呼び方（「タップ」「クリック」）
export function createThinkingScene({ THREE, problem, card, showCard = false, layout = 'above', action = 'タップ' }) {
  const cardH = CARD_H / CARD_W;
  const group = new THREE.Group();
  const disposables = [];
  const toScene = (px, py, z = 0) => new THREE.Vector3(px / CARD_W - 0.5, (CARD_H / 2 - py) / CARD_W, z);

  const texturePlane = (canvas, width, height, transparent = true) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent, depthWrite: !transparent });
    const geometry = new THREE.PlaneGeometry(width, height);
    return { mesh: new THREE.Mesh(geometry, material), texture, dispose: () => [texture, material, geometry].forEach(d => d.dispose()) };
  };

  if (showCard) {
    const cardPlane = texturePlane(card.canvas, 1, cardH, false);
    group.add(cardPlane.mesh);
    disposables.push(cardPlane);
  }

  const highlightCanvas = document.createElement('canvas');
  highlightCanvas.width = CARD_W;
  highlightCanvas.height = CARD_H;
  const highlight = texturePlane(highlightCanvas, 1, cardH);
  highlight.mesh.position.z = HIGHLIGHT_Z;
  group.add(highlight.mesh);
  disposables.push(highlight);

  // 吹き出しが最も高くなるとき（すべての気づきを出したとき）の高さ。画面に収める範囲を一定にするために使う
  const maxBubblePx = Math.max(...problem.focuses.map((f, i) => {
    const all = { opened: f.insights.length, revealed: f.insights.length };
    return renderBubble(problem, i, all, { action }).height;
  }));
  const bubbleWidth = (l) => SCENE.bubbleWidth[l];
  const maxBubbleH = (l) => maxBubblePx * (bubbleWidth(l) / BUBBLE_W);

  // 注目箇所と吹き出しをつなぐ線（折れ線。区間ごとの円柱と、角を埋める球でつくる）
  const segmentGeometry = new THREE.CylinderGeometry(LINE_RADIUS, LINE_RADIUS, 1, 8);
  const jointGeometry = new THREE.SphereGeometry(LINE_RADIUS, 8, 6);
  const lineMaterial = new THREE.MeshBasicMaterial();
  const line = new THREE.Group();
  group.add(line);
  disposables.push({ dispose: () => [segmentGeometry, jointGeometry, lineMaterial].forEach(d => d.dispose()) });
  const up = new THREE.Vector3(0, 1, 0);
  const setLine = (points) => {
    line.clear();
    points.forEach((p, i) => {
      if (i > 0) {
        const a = points[i - 1];
        const segment = new THREE.Mesh(segmentGeometry, lineMaterial);
        segment.position.copy(a).add(p).multiplyScalar(0.5);
        segment.scale.set(1, a.distanceTo(p), 1);
        segment.quaternion.setFromUnitVectors(up, p.clone().sub(a).normalize());
        line.add(segment);
      }
      if (i > 0 && i < points.length - 1) {
        const joint = new THREE.Mesh(jointGeometry, lineMaterial);
        joint.position.copy(p);
        line.add(joint);
      }
    });
  };

  let bubble = null; // { key, plane }
  let lastView = null;

  const clearBubble = () => {
    line.clear();
    if (!bubble) return;
    group.remove(bubble.plane.mesh);
    bubble.plane.dispose();
    bubble = null;
  };

  // 問いかけ・答えが出るたびに吹き出しを描き直す
  const updateBubble = (view) => {
    const index = problem.focuses.findIndex(f => f.id === view.activeId);
    const entry = index >= 0 ? view.focus[view.activeId] : null;
    const key = entry && entry.opened > 0 ? `${layout}:${view.activeId}:${entry.opened}:${entry.revealed}` : null;
    if (bubble?.key === key) return;
    clearBubble();
    if (!key) return;

    const canvas = renderBubble(problem, index, entry, { action });
    const w = bubbleWidth(layout);
    const h = canvas.height * (w / BUBBLE_W);
    const plane = texturePlane(canvas, w, h);
    const center = bubbleCenter(layout, cardH, w, h);
    plane.mesh.position.set(center.x, center.y, center.z);
    group.add(plane.mesh);
    bubble = { key, plane };

    const path = connectorPathPx(layout, card.focuses[index].rects, card.margin).map(p => toScene(p.x, p.y, LINE_Z));
    const end = lineEnd(layout, center, w, h, path[path.length - 1]);
    setLine([...path, new THREE.Vector3(end.x, end.y, end.z)]);
    lineMaterial.color.set(focusColor(index));
  };

  return {
    group,
    cardH,

    setView(view) {
      lastView = view;
      renderHighlight(highlightCanvas, card, {
        shown: view.shown,
        activeId: view.activeId,
        nextId: view.nextId,
        openedIds: new Set(Object.keys(view.focus).filter(id => view.focus[id].opened > 0)),
        cueRects: card.rectsFor(view.cueSpan),
      });
      highlight.texture.needsUpdate = true;
      updateBubble(view);
    },

    // 吹き出しの置き方を変える（'above' | 'side'）
    setLayout(next) {
      if (next === layout) return;
      layout = next;
      clearBubble();
      if (lastView) updateBubble(lastView);
    },

    get layout() {
      return layout;
    },

    // 吹き出しの幅と最大の高さ（配置を選ぶ計算に使う）
    sizes() {
      return {
        above: { w: bubbleWidth('above'), maxH: maxBubbleH('above') },
        side: { w: bubbleWidth('side'), maxH: maxBubbleH('side') },
      };
    },

    contentBox(l = layout) {
      return contentBox(l, cardH, bubbleWidth(l), maxBubbleH(l));
    },

    // raycaster が指すカード上の注目箇所のID（なければ null）
    pick(raycaster) {
      const hit = raycaster.intersectObject(highlight.mesh)[0];
      if (!hit?.uv) return null;
      return hitTestFocus(card.focuses, hit.uv.x * CARD_W, (1 - hit.uv.y) * CARD_H);
    },

    // 注目箇所の行ごとの矩形の四隅（group の座標）。画面上に操作用のボタンを重ねるのに使う
    focusTargets() {
      return card.focuses.map(f => ({
        id: f.id,
        rects: f.rects.map(r => [
          toScene(r.x, r.y, HIGHLIGHT_Z), toScene(r.x + r.w, r.y, HIGHLIGHT_Z),
          toScene(r.x, r.y + r.h, HIGHLIGHT_Z), toScene(r.x + r.w, r.y + r.h, HIGHLIGHT_Z),
        ]),
      }));
    },

    dispose() {
      clearBubble();
      disposables.forEach(d => d.dispose());
    },
  };
}
