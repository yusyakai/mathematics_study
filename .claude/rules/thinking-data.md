---
paths:
  - "src/thinking-app/data/**"
  - "src/thinking-app/lib/schema.js"
  - "src/thinking-app/lib/catalog.js"
---

# 問題データと分類の定義

- 項目の意味、役割・種類の判断基準、書き方は `docs/thinking-app/data-spec.md` に従う。データを作る・直す前に読む。
- 形式の基準は `schema.js`、選択肢の基準は `catalog.js`。形式を変えるときは `THINKING_JSON_SCHEMA` と `validateThinking()` を両方直し、`SCHEMA_VERSION` を上げて既存データを移行する。どちらを変えても `data-spec.md` を合わせて直す（`docs.test.js` が一部の食い違いを検出する）。
- データ編集後の検証は Hook が自動で行う。エラーは必ず直し、警告は内容を見直す。
