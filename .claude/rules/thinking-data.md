---
paths:
  - "src/data/thinking/**"
  - "src/thinking/**"
---

# 思考プロセスデータ

- 形式の定義と検証は `src/thinking/schema.js` が唯一の基準。形式を変えるときは `THINKING_JSON_SCHEMA` と `validateThinking()` を両方更新し、`SCHEMA_VERSION` の扱いも検討する。
- 1問 = 1ファイル（`src/data/thinking/<id>.json`）。置くだけで一覧に載る。
- `triggers[].quote` は問題文からの完全一致の引用にする（文字位置は書かない）。同じ文字列が複数あるときだけ `occurrence` を使う。
- `thoughts` は 気づき(notice) → 方針(strategy) → 実行(execute) の順に並べ、`from` は前に出てきたトリガーかノードだけを参照する。
- 方針には必ず `adopted` を付け、不採用の方針には `reason`（なぜ選ばないか）を書く。採用しなかった解法も学習の材料として残す。
- AIで生成したデータは `meta.source: "ai"`、`meta.model` に使用モデル、人が確認するまで `meta.reviewed: false` にする。
- 作成・編集後は `npm run validate:thinking` で検証する。
