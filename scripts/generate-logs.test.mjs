import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateLogs } from './generate-logs.mjs';

test('日志从功能提交起算，保留历史版本与特殊字符，重复生成不重复', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'website-logs-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  const commit = (message) => { git('add', '.'); git('commit', '-m', message); };
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Logs Test');
    git('config', 'user.email', 'logs@example.test');
    writeFileSync(join(cwd, 'note.txt'), 'old', { encoding: 'utf8' });
    commit('旧历史');
    assert.throws(() => generateLogs(cwd), /尚无 VERSION/);
    // 保留一个在功能上线之前创建的分支，验证合并后的日志覆盖。
    git('branch', 'old-branch');
    writeFileSync(join(cwd, 'VERSION'), '1.1\n', { encoding: 'utf8' });
    commit('feat: 增加了日志功能');
    assert.deepEqual(generateLogs(cwd).entries.map(({ message, version }) => ({ message, version })), [
      { message: 'feat: 增加了日志功能', version: '1.1' },
    ]);
    writeFileSync(join(cwd, 'note.txt'), 'new', { encoding: 'utf8' });
    commit('docs: 更新笔记 <script> & "引号"');
    writeFileSync(join(cwd, 'VERSION'), '1.2\n', { encoding: 'utf8' });
    commit('feat: 新增页面');
    const data = generateLogs(cwd);
    assert.deepEqual(data.entries.map(({ version }) => version), ['1.2', '1.1', '1.1']);
    assert.equal(data.entries[1].message, 'docs: 更新笔记 <script> & "引号"');
    assert.deepEqual(generateLogs(cwd), data);
    git('checkout', 'old-branch');
    writeFileSync(join(cwd, 'branch.txt'), 'branch', { encoding: 'utf8' });
    commit('feat: 分支功能');
    git('checkout', 'main');
    git('merge', '--no-ff', 'old-branch', '-m', 'feat: 合并功能');
    const merged = generateLogs(cwd).entries;
    assert.equal(merged.length, 5);
    assert.equal(merged[0].message, 'feat: 合并功能');
    assert.equal(merged.find(({ message }) => message === 'feat: 分支功能').version, '1.2');
    assert.equal(new Set(merged.map(({ sha }) => sha)).size, 5);
    writeFileSync(join(cwd, 'VERSION'), 'invalid\n', { encoding: 'utf8' });
    commit('无效版本');
    assert.throws(() => generateLogs(cwd), /无效版本号/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
