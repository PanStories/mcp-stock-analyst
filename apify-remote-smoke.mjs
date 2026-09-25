// Apify Standby 远端冒烟测试
// 用法：$env:APIFY_TOKEN="apify_api_xxx"; node apify-remote-smoke.mjs [standbyUrl]
import process from 'node:process';

const BASE = process.argv[2] ?? process.env.STANDBY_URL ?? 'https://neeenja--mcp-stock-analyst.apify.actor';
const TOKEN = process.env.APIFY_TOKEN;

if (!TOKEN) {
  console.error('缺少 APIFY_TOKEN 环境变量（Apify Console → Settings → API & Integrations）');
  process.exit(1);
}

const authHeaders = { Authorization: `Bearer ${TOKEN}` };

/** 解析响应：兼容 application/json 与 text/event-stream */
async function parse(res) {
  const ct = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (ct.includes('text/event-stream')) {
    const line = text.split('\n').find((l) => l.startsWith('data:'));
    return line ? JSON.parse(line.slice(5).trim()) : { raw: text };
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function mcp(body, timeoutMs = 180000) {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: res.status, payload: await parse(res) };
}

const started = Date.now();
console.log(`0) 目标端点: ${BASE}/mcp`);
console.log('   首次请求会唤醒 Standby 实例，冷启动通常 30–90 秒...');

// 1) 健康检查（同时触发 standby 冷启动）
const health = await fetch(`${BASE}/health`, { headers: authHeaders, signal: AbortSignal.timeout(240000) });
console.log(`1) /health: HTTP ${health.status} ${JSON.stringify(await parse(health))}（${((Date.now() - started) / 1000).toFixed(1)}s）`);

// 2) MCP initialize
const init = await mcp({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'apify-smoke', version: '1.0' } },
});
console.log('2) initialize:', init.payload?.result?.serverInfo
  ? `${init.payload.result.serverInfo.name} v${init.payload.result.serverInfo.version}`
  : JSON.stringify(init.payload));

// 3) tools/list
const tools = await mcp({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
console.log('3) tools/list:', (tools.payload?.result?.tools ?? []).map((t) => t.name).join(', '));

// 4) 真实数据：get_quote
const quote = await mcp({
  jsonrpc: '2.0', id: 3, method: 'tools/call',
  params: { name: 'get_quote', arguments: { codes: '600519,00700,AAPL' } },
});
console.log('4) get_quote:', quote.payload?.result?.content?.[0]?.text?.split('\n').join('\n   '));

// 4b) 真实数据：get_quote（台湾）
const quoteTw = await mcp({
  jsonrpc: '2.0', id: 6, method: 'tools/call',
  params: { name: 'get_quote', arguments: { codes: '2330.TW,tw2454,^TWII' } },
});
console.log('4b) get_quote (Taiwan):', quoteTw.payload?.result?.content?.[0]?.text?.split('\n').join('\n   '));

// 5) 真实数据：search_stock + get_kline
const search = await mcp({
  jsonrpc: '2.0', id: 4, method: 'tools/call',
  params: { name: 'search_stock', arguments: { query: '宁德时代' } },
});
console.log('5) search_stock:', search.payload?.result?.content?.[0]?.text);

const searchTw = await mcp({
  jsonrpc: '2.0', id: 7, method: 'tools/call',
  params: { name: 'search_stock', arguments: { query: '台积电' } },
});
console.log('5b) search_stock (Taiwan):', searchTw.payload?.result?.content?.[0]?.text);

const kline = await mcp({
  jsonrpc: '2.0', id: 5, method: 'tools/call',
  params: { name: 'get_kline', arguments: { code: '600519', days: 30, period: 'day' } },
});
console.log('6) get_kline:', kline.payload?.result?.content?.[0]?.text?.split('\n').slice(0, 2).join(' | '));

const klineTw = await mcp({
  jsonrpc: '2.0', id: 8, method: 'tools/call',
  params: { name: 'get_kline', arguments: { code: 'tw2317', days: 30, period: 'day' } },
});
console.log('6b) get_kline (Taiwan tw2317):', klineTw.payload?.result?.content?.[0]?.text?.split('\n').slice(0, 2).join(' | '));

console.log(`\n✅ 远端 MCP 服务可用，总耗时 ${((Date.now() - started) / 1000).toFixed(1)}s`);
