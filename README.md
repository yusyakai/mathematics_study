# mathematics_study

高校数学の学習用ウェブアプリを2つ収めたリポジトリです。2つのアプリは独立していて、互いのコードに依存しません。

| アプリ | 内容 | 公開URL | コード |
|---|---|---|---|
| 着眼点トレーナー | 問題文のどこを見て、何を考えるかを1つずつ表示する（PC・スマホの立体表示・文字表示・カメラのAR表示、作成ツール） | https://yusyakai.github.io/mathematics_study/thinking/ | `thinking/index.html`、`src/thinking-app/` |
| 解法セレクト | 問題のタイプ・使う公式を4択で選ぶ練習 | https://yusyakai.github.io/mathematics_study/ | `index.html`、`src/` 直下 |

## 技術構成

- React 19 + Vite 8（2つのアプリを1つのビルドで出力するマルチページ構成）
- 立体表示・AR：three.js と MindAR（画像認識）を CDN から必要なときだけ読み込む
- テスト：Node.js 標準のテストランナー（`node --test`）
- 公開：GitHub Pages（main に push すると、チェックの後に自動で公開）

## 開発の始め方

Node.js 22 を使います。

```sh
npm ci
npm run dev        # http://localhost:5173/thinking/ で着眼点トレーナーが開く
```

| コマンド | 内容 |
|---|---|
| `npm run check:thinking` | 着眼点トレーナーの確認をまとめて実行（下の4つ） |
| `npm run validate:thinking` | 問題データのチェック（`-- --strict` で警告もエラー扱い） |
| `npm run lint:thinking` | 着眼点トレーナーの Lint |
| `npm test` | 単体テスト |
| `npm run build` | 本番用ビルド（`dist/`） |

`npm run lint` はリポジトリ全体が対象で、解法セレクトに以前からの指摘が残っているため失敗します。

## ディレクトリ構成（着眼点トレーナー）

```
thinking/index.html            入口のHTML
src/thinking-app/
  App.jsx                      画面の切り替えと一覧
  components/                  各画面（学習画面・カード・振り返り・作成ツール）
    LearnView.jsx              学習画面（表示の切り替え・キー操作）
    stages/                    学習画面の表示（立体・文字・カメラ）
  data/                        問題データ（1問 = 1つの JSON ファイル）
  lib/                         データ形式・分類・進み具合・描画などの処理（__tests__ に単体テスト）
    scene/                     カード・吹き出し・線をまとめたシーン部品と配置の計算
    hosts/                     表示先（screenHost: PC・スマホの画面、cameraHost: カメラのAR）
docs/thinking-app/
  spec.md                      仕様と改善の検討結果
  data-spec.md                 入力項目と分類の定義（問題データを作るときに読む）
scripts/validate-thinking.mjs  問題データのチェック
```

## 問題データを追加する

アプリの「問題データを作る（作成ツール）」で作って JSON に書き出し、`src/thinking-app/data/` に置きます。
項目の意味と分類の基準は [データ仕様書](docs/thinking-app/data-spec.md) を参照してください。

## 公開

- main への push で `.github/workflows/deploy-pages.yml` がチェック・テスト・ビルドを行い、GitHub Pages に公開します。
- 作業ブランチへの push では `.github/workflows/ci.yml` が同じチェックを行います。
