// 端到端 MCP 协议测试：通过 stdio 与 server 握手并列出工具、调用 get_quote
import { spawn } from 'node:child_process';

const proc = spawn('node', ['build/index.js'], {
  cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buffer = '';
const waiters = [];
proc.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    for (const w of waiters.splice(0)) {
      try { w.resolve(JSON.parse(line)); } catch (e) { w.reject(e); }
    }
  }
});
proc.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

const send = (msg) => {
  const p = new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  proc.stdin.write(JSON.stringify(msg) + '\n');
  return p;
};

// 1. initialize
const init = await send({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'smoke-e2e', version: '1.0' },
  },
});
console.log('INIT OK, server:', init.result.serverInfo.name, init.result.serverInfo.version);

// 2. initialized notification
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

// 3. tools/list
const tools = await send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
console.log('TOOLS:', tools.result.tools.map((t) => t.name).join(', '));

// 4. 调用 get_quote
const q = await send({
  jsonrpc: '2.0', id: 3, method: 'tools/call',
  params: { name: 'get_quote', arguments: { codes: '600519,AAPL,2330.TW' } },
});
console.log('QUOTE RESULT:', q.result.content[0].text);

// 5. 调用 search_stock
const s = await send({
  jsonrpc: '2.0', id: 4, method: 'tools/call',
  params: { name: 'search_stock', arguments: { query: 'GZMT' } },
});
console.log('SEARCH RESULT:', s.result.content[0].text);

// 6. 调用 get_kline（台湾）
const k = await send({
  jsonrpc: '2.0', id: 5, method: 'tools/call',
  params: { name: 'get_kline', arguments: { code: 'tw2317', days: 25, period: 'day' } },
});
console.log('KLINE RESULT (Taiwan tw2317):', k.result.content[0].text.split('\n').slice(0, 4).join('\n'), '...');

proc.kill();
process.exit(0);
