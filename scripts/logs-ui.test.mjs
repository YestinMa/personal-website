import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('日志显示短哈希及北京时间分钟，区分提交时间和推送时间并安全渲染', async () => {
  const list = { replaceChildren(...items) { this.items = items; } };
  const status = {};
  let load;
  const document = {
    querySelector: () => status,
    getElementById: () => list,
    addEventListener: (_, callback) => { load = callback; },
    createElement: () => ({ children: [], append(...children) { this.children.push(...children); } }),
  };
  const sha = 'abc1234' + 'd'.repeat(33);
  const entry = { sha, version: '1.1', message: 'fix: <script>中文 & "引号"', committedAt: '2026-10-28T01:00:00Z' };
  const entries = [{ ...entry, pushedAt: '2026-10-28T02:30:59Z' }, entry];
  runInNewContext(readFileSync(new URL('../js/logs.js', import.meta.url), 'utf8'), {
    document, Intl, Date, console,
    fetch: async () => ({ ok: true, json: async () => ({ entries }) }),
  });
  await load();
  assert.equal(list.items[0].children[0].textContent, `${entry.message} (1.1)`);
  const [hash, time] = list.items[0].children[1].children;
  assert.equal(hash.textContent, 'abc1234');
  assert.equal(hash.title, sha);
  assert.equal(time.textContent, '推送时间 2026-10-28 10:30 (北京时间)');
  assert.equal(list.items[1].children[1].children[1].textContent, '提交时间 2026-10-28 09:00 (北京时间)');
  assert.equal(status.hidden, true);
});
