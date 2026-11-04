// 表示を始められなかった理由。code ごとに画面で案内を変える
//   insecure    … HTTPS でない（カメラ）
//   unsupported … カメラに対応していないブラウザ
//   load        … 部品（three.js・MindAR）を読み込めない
//   webgl       … 3D描画（WebGL）が使えない
//   camera      … カメラを起動できない
//   aborted     … 準備中に画面を離れた
export class StageError extends Error {
  constructor(code, cause) {
    super(code);
    this.name = 'StageError';
    this.code = code;
    this.cause = cause;
  }
}
