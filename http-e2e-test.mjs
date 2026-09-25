// HTTP(Streamable) 端到端测试：就绪探针 + initialize + tools/list + tools/call
import { spawn } from 'node:child_process';

const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;

const child = spawn('node', ['build/http.js'], {
  cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return true;
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/** 解析响应：兼容 application/json 与 text/event-stream */
async function parse(res) {
  const ct = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (ct.includes('text/event-stream')) {
    const line = text.split('\n').find((l) => l.startsWith('data:'));
    return line ? JSON.parse(line.slice(5).trim()) : { raw: text };
  }
  return text ? JSON.parse(text) : {};
}

async function mcp(body) {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, payload: await parse(res) };
}

const ready = await waitReady();
console.log('1) 服务启动:', ready ? 'OK' : 'FAILED');
if (!ready) {
  child.kill();
  process.exit(1);
}

// Apify 容器就绪探针
const probe = await fetch(`${BASE}/`, { headers: { 'x-apify-container-server-readiness-probe': '1' } });
console.log('2) Apify 就绪探针:', probe.status, (await probe.text()).trim());

// initialize
const init = await mcp({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'http-e2e', version: '1.0' } },
});
console.log('3) initialize:', init.payload?.result?.serverInfo
  ? `${init.payload.result.serverInfo.name} v${init.payload.result.serverInfo.version}`
  : JSON.stringify(init.payload));

// initialized notification
await mcp({ jsonrpc: '2.0', method: 'notifications/initialized' });

// tools/list
const tools = await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
console.log('4) tools/list:', (tools.payload?.result?.tools ?? []).map((t) => t.name).join(', '));

// tools/call -> get_quote
const quote = await mcp({
  jsonrpc: '2.0', id: 3, method: 'tools/call',
  params: { name: 'get_quote', arguments: { codes: '600519,00700,AAPL' } },
});
console.log('5) get_quote:', quote.payload?.result?.content?.[0]?.text?.split('\n').join(' | '));

// tools/call -> search_stock
const search = await mcp({
  jsonrpc: '2.0', id: 4, method: 'tools/call',
  params: { name: 'search_stock', arguments: { query: '茅台' } },
});
console.log('6) search_stock:', search.payload?.result?.content?.[0]?.text?.split('\n').join(' | '));

// tools/call -> get_kline
const kline = await mcp({
  jsonrpc: '2.0', id: 5, method: 'tools/call',
  params: { name: 'get_kline', arguments: { code: '600519', days: 5 } },
});
console.log('7) get_kline:', kline.payload?.result?.content?.[0]?.text?.split('\n').slice(0, 2).join(' | '));

// 非 POST 应返回 405
const bad = await fetch(`${BASE}/mcp`, { method: 'GET' });
console.log('8) GET /mcp 应 405 ->', bad.status);

child.kill();
process.exit(0);
