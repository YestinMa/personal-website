import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

export function generateLogs(cwd = repoRoot) {
  if (git(cwd, 'rev-parse', '--is-shallow-repository') === 'true') {
    throw new Error('生成完整日志需要完整 Git 历史，请使用 fetch-depth: 0。');
  }
  // 以版本文件首次进入主线的提交为起点，不依赖可变的提交说明或提交日期。
  const commits = git(cwd, 'rev-list', '--first-parent', '--reverse', 'HEAD').split('\n').filter(Boolean);
  const firstVersion = git(cwd, 'log', '--first-parent', '--reverse', '--diff-filter=A', '--format=%H', 'HEAD', '--', 'VERSION').split('\n')[0];
  const boundary = firstVersion ? commits.indexOf(firstVersion) : -1;
  if (boundary < 0) throw new Error('Git 历史中尚无 VERSION，请先提交日志功能。');

  const start = commits[boundary];
  // 排除起点以前已可达的历史，保留之后合入主线的分支提交；拓扑顺序确保新提交在前。
  const range = boundary === 0 ? ['HEAD'] : ['HEAD', `^${commits[boundary - 1]}`];
  const shas = git(cwd, 'rev-list', '--topo-order', ...range).split('\n').filter(Boolean);
  return {
    entries: shas.map((sha) => {
      // 分支可能创建于版本文件引入之前，此时沿用合入前的主线版本。
      const hasVersion = git(cwd, 'ls-tree', '--name-only', sha, '--', 'VERSION') === 'VERSION';
      const mainline = !hasVersion && commits.slice(boundary).find((mainSha) => {
        try { git(cwd, 'merge-base', '--is-ancestor', sha, mainSha); return true; }
        catch { return false; }
      });
      const version = git(cwd, 'show', `${hasVersion ? sha : mainline || start}:VERSION`);
      if (!/^\d+\.\d+(?:\.\d+)?$/.test(version)) throw new Error(`无效版本号：${version}`);
      return { sha, message: git(cwd, 'show', '-s', '--format=%s', sha), version };
    }),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] || resolve(repoRoot, 'dist/content/logs.json'));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(generateLogs(), null, 2)}\n`, { encoding: 'utf8' });
  console.log(`Logs generated: ${output}`);
}
