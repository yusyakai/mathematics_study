// PostToolUse フック: src/data/thinking/*.json を編集したら必ず検証し、エラーを Claude に返す
import { spawnSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path ?? '';
if (!/src\/data\/thinking\/[^/]+\.json$/.test(file)) process.exit(0);

const result = spawnSync('node', ['scripts/validate-thinking.mjs', file], {
  cwd: process.env.CLAUDE_PROJECT_DIR,
  encoding: 'utf8',
});
if (result.status !== 0) {
  process.stderr.write(result.stdout + result.stderr);
  process.exit(2);
}
