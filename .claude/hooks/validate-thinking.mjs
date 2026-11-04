// PostToolUse フック: src/thinking-app/data/*.json を編集したら必ず検証する
//   エラー → 終了コード 2 で Claude に修正を求める
//   警告のみ → 編集は通し、警告を Claude に伝える
import { spawnSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path ?? '';
if (!/src\/thinking-app\/data\/[^/]+\.json$/.test(file)) process.exit(0);

const result = spawnSync('node', ['scripts/validate-thinking.mjs', file], {
  cwd: process.env.CLAUDE_PROJECT_DIR,
  encoding: 'utf8',
});
const output = result.stdout + result.stderr;
if (result.status !== 0) {
  process.stderr.write(output);
  process.exit(2);
}
if (output.includes('警告:')) {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `思考データの検証で警告があります（docs/thinking-app/data-spec.md を参照）:\n${output}` },
  }));
}
