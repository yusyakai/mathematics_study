// 思考プロセスデータ (src/thinking-app/data/*.json) を検証する
// 使い方: npm run validate:thinking [ファイル...]
// 手作業で編集したときも、AIで生成したときも、取り込む前にこれを通す
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateThinking } from '../src/thinking-app/lib/schema.js';

const DIR = 'src/thinking-app/data';
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => join(DIR, f));

let failed = 0;
for (const file of files) {
  let errors;
  try {
    errors = validateThinking(JSON.parse(readFileSync(file, 'utf8')));
  } catch (e) {
    errors = [`JSONとして読めません: ${e.message}`];
  }
  if (errors.length) {
    failed++;
    console.error(`NG ${file}`);
    errors.forEach(e => console.error(`   - ${e}`));
  } else {
    console.log(`OK ${file}`);
  }
}
process.exit(failed ? 1 : 0);
