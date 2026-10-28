import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

export async function fetchPushRuns(repository, token, request = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('无效的 GitHub 仓库名');
  const pushes = [];
  // 不在 API 请求中加筛选条件，避免筛选查询的 1000 条上限；逐页读取后再筛选。
  for (let page = 1; ; page += 1) {
    const response = await request(`https://api.github.com/repos/${repository}/actions/workflows/pages.yml/runs?per_page=100&page=${page}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) throw new Error(`无法读取推送工作流记录：HTTP ${response.status}`);
    const { workflow_runs: runs } = await response.json();
    if (!Array.isArray(runs)) throw new Error('无效的推送工作流记录');
    for (const run of runs) {
      if (run.event === 'push' && run.head_branch === 'main' &&
          /^[a-f0-9]{40}$/.test(run.head_sha) && Number.isFinite(Date.parse(run.created_at))) {
        pushes.push({ sha: run.head_sha, pushedAt: new Date(run.created_at).toISOString() });
      }
    }
    if (runs.length < 100) break;
  }
  return pushes;
}

export function generateLogs(cwd = repoRoot, pushes = []) {
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
  const pushTimes = new Map();
  const targetShas = new Set(shas);
  // 一次推送可包含多个提交；按首次触发时间归属，重跑或后续推送不覆盖原时间。
  for (const push of [...pushes].sort((a, b) => a.pushedAt.localeCompare(b.pushedAt))) {
    if (!/^[a-f0-9]{40}$/.test(push.sha) || !Number.isFinite(Date.parse(push.pushedAt))) continue;
    let reachable;
    try {
      reachable = git(cwd, 'rev-list', push.sha, ...(boundary ? [`^${commits[boundary - 1]}`] : []));
    } catch {
      // 强制推送后，旧工作流可能指向已不在本次完整检出中的提交。
      continue;
    }
    for (const sha of reachable.split('\n')) {
      if (targetShas.has(sha) && !pushTimes.has(sha)) pushTimes.set(sha, push.pushedAt);
    }
    if (pushTimes.size === targetShas.size) break;
  }
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
      return {
        sha,
        message: git(cwd, 'show', '-s', '--format=%s', sha),
        version,
        committedAt: new Date(git(cwd, 'show', '-s', '--format=%cI', sha)).toISOString(),
        pushedAt: pushTimes.get(sha) || null,
      };
    }),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pushes = process.env.GITHUB_ACTIONS === 'true'
    ? await fetchPushRuns(process.env.GITHUB_REPOSITORY, process.env.GITHUB_TOKEN)
    : [];
  const output = resolve(process.argv[2] || resolve(repoRoot, 'dist/content/logs.json'));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(generateLogs(repoRoot, pushes), null, 2)}\n`, { encoding: 'utf8' });
  console.log(`Logs generated: ${output}`);
}
