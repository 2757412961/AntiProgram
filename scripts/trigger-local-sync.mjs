const endpoint = process.env.LOCAL_WORKER_URL
  || 'http://127.0.0.1:8787/cdn-cgi/local/scheduled?cron=*/30+*+*+*+*&format=json';

try {
  const response = await fetch(endpoint, {
    headers: { accept: 'application/json, text/plain;q=0.9' },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`);
  console.log(body);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`无法触发本地 scheduled handler：${message}`);
  console.error('请先运行 npm run dev，并确认本地 Worker 正在监听 127.0.0.1:8787。');
  process.exitCode = 1;
}
