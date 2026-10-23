---
paths:
  - "src/thinking-app/**"
  - "thinking/**"
---

# 着眼点トレーナー（別アプリ）

- 既存の学習アプリ（`index.html` / `src/` 直下）とは独立したアプリ。入口は `thinking/index.html` → `src/thinking-app/main.jsx`。既存アプリのコードや状態（`AppContext` など）に依存させない。
- データ形式の定義と検証は `src/thinking-app/lib/schema.js` が唯一の基準。形式を変えるときは `THINKING_JSON_SCHEMA` と `validateThinking()` を両方更新し、`SCHEMA_VERSION` を上げる。

## 思考データ（`src/thinking-app/data/<id>.json`、1問 = 1ファイル、置くだけで一覧に載る）

- `focuses[].priority`: 注目箇所どうしの優先順位（1が最優先、重複不可）。表示する番号になる。
- `focuses[].insights[].priority`: その注目箇所の中での優先順位（1が最優先、重複不可）。タップごとに優先順位の高いものから1個ずつ表示する。
- `quote` は問題文からの完全一致の引用にする（文字位置は書かない）。注目箇所どうしは重ねない。同じ文字列が複数あるときだけ `occurrence` を使う。
- `insights` は「`cue` と書いてある → `thought`」の形で、問題文に**書いてあること**から直接思い浮かべることだけを書く。方針や解答のまとめは書かない。「書いていないこと」からの気づきはいまは扱わない。
- AIで生成したデータは `meta.source: "ai"`、`meta.model` に使用モデル、人が確認するまで `meta.reviewed: false` にする。
- 作成・編集後は `npm run validate:thinking` で検証する。
