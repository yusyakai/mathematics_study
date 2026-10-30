---
paths:
  - "src/thinking-app/App.jsx"
  - "src/thinking-app/app.css"
  - "src/thinking-app/components/**"
  - "src/thinking-app/lib/canvasRender.js"
  - "src/thinking-app/lib/colors.js"
---

# 着眼点トレーナーの画面

- 見た目の方針は `docs/thinking-app/design.md` に従う。画面を作る・変える前に読み、方針を変えたら同じ変更でこのガイドも直す。
- 色・影・角丸は `app.css` 冒頭のトークン（CSS 変数）を使い、色の値を直接書かない。ダーク表示はトークンの差し替えだけで対応する。注目箇所・気づきの種類・難易度の色は `lib/colors.js` から使う。
- 問題文の印の決まり（破線 = 未読、実線 = 見た、塗り = いま見ている）は、文字表示（`app.css`）と立体表示・カメラ（`canvasRender.js`）でそろえる。
- 押せるものは 44px 以上（小さいボタンも 36px 以上）。アイコンは `components/Icon.jsx` に足し、アイコンだけのボタンには `aria-label` を付ける。
- 変更したら、スマホ縦・PC・ダーク表示の3つで画面を見て確かめる。
