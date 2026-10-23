---
paths:
  - "src/data/thinking/**"
  - "src/thinking/**"
---

# 思考プロセスデータ

- 形式の定義と検証は `src/thinking/schema.js` が唯一の基準。形式を変えるときは `THINKING_JSON_SCHEMA` と `validateThinking()` を両方更新し、`SCHEMA_VERSION` を上げる。
- 1問 = 1ファイル（`src/data/thinking/<id>.json`）。置くだけで一覧に載る。
- `focuses` は問題文の注目箇所を **見るべき順** に並べる（配列の順番が表示される番号になる）。
- `quote` は問題文からの完全一致の引用にする（文字位置は書かない）。注目箇所どうしは重ねない。同じ文字列が複数あるときだけ `occurrence` を使う。
- `insights` には方針や解答のまとめではなく、その箇所の文面から直接思い浮かべることを書く。
  - `written`: 「`cue`」と書いてある → `thought`
  - `unwritten`: 「`cue`」とは書いていない → `thought`（例: 「並べる」とは書いていない → nPr ではなく nCr）
- AIで生成したデータは `meta.source: "ai"`、`meta.model` に使用モデル、人が確認するまで `meta.reviewed: false` にする。
- 作成・編集後は `npm run validate:thinking` で検証する。
