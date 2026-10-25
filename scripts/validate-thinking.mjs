// 思考データ (src/thinking-app/data/*.json) を検証する
// 使い方: npm run validate:thinking [-- --strict] [ファイル...]
//   エラー（データとして使えない）があれば失敗する。--strict のときは警告（内容の見直し推奨）でも失敗する。
// 手作業で編集したときも、AIで生成したときも、取り込む前にこれを通す
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { validateThinking } from '../src/thinking-app/lib/schema.js';

const DIR = 'src/thinking-app/data';
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const named = args.filter(a => !a.startsWith('--'));
const files = named.length
  ? named
  : readdirSync(DIR).filter(f => f.endsWith('.json')).sort().map(f => join(DIR, f));

let failed = 0;
for (const file of files) {
  let result;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    result = validateThinking(data);
    if (data?.id && basename(file, '.json') !== data.id) {
      result.errors.push(`ファイル名を id と同じ「${data.id}.json」にしてください`);
    }
  } catch (e) {
    result = { errors: [`JSONとして読めません: ${e.message}`], warnings: [] };
  }
  const { errors, warnings } = result;
  const ng = errors.length > 0 || (strict && warnings.length > 0);
  if (ng) failed++;
  console[ng ? 'error' : 'log'](`${ng ? 'NG' : 'OK'} ${file}`);
  errors.forEach(e => console.error(`   エラー: ${e}`));
  warnings.forEach(w => console[ng ? 'error' : 'log'](`   警告: ${w}`));
}
process.exit(failed ? 1 : 0);
