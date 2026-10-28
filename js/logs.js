async function loadLogs() {
  const status = document.querySelector('.logs-status');
  const list = document.getElementById('logs-entries');
  try {
    const response = await fetch('content/logs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Logs returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.entries) || data.entries.some((entry) =>
      typeof entry.message !== 'string' || typeof entry.version !== 'string')) {
      throw new Error('Invalid logs data');
    }
    // 提交信息属于外部文本，使用 textContent，避免将特殊字符解释为 HTML。
    const entries = data.entries.map((entry) => {
      const item = document.createElement('li');
      item.textContent = `${entry.message} (${entry.version})`;
      return item;
    });
    list.replaceChildren(...entries);
    status.hidden = entries.length > 0;
    status.textContent = entries.length ? '' : '暂无更新记录。';
  } catch (error) {
    status.hidden = false;
    status.textContent = '日志暂时无法加载，请稍后刷新重试。';
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', loadLogs);
