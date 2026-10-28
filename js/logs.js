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
      const message = document.createElement('div');
      message.textContent = `${entry.message} (${entry.version})`;
      item.append(message);
      const metadata = document.createElement('div');
      metadata.className = 'logs-metadata';
      const hash = document.createElement('span');
      hash.textContent = entry.sha ? entry.sha.slice(0, 7) : '哈希暂无记录';
      hash.title = entry.sha || '';
      const time = document.createElement('time');
      const timestamp = entry.pushedAt || entry.committedAt;
      const date = new Date(timestamp);
      if (timestamp && Number.isFinite(date.getTime())) {
        // 固定北京时间，避免浏览器所在时区改变历史记录；界面仅显示到分钟。
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(date);
        const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
        const formatted = `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
        time.dateTime = date.toISOString();
        time.textContent = `${entry.pushedAt ? '推送时间' : '提交时间'} ${formatted} (北京时间)`;
        time.title = entry.pushedAt ? '首次触发主分支推送工作流的时间' : '历史推送时间暂无记录，此处为 Git 提交时间';
      } else {
        time.textContent = '推送时间暂无记录';
      }
      metadata.append(hash, time);
      item.append(metadata);
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
