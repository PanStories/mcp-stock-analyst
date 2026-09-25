// 直接调用数据层验证（不经 MCP 协议，快速冒烟测试）
const { getQuotes, getKline } = await import('./build/datasources/tencent.js');
const { searchStock } = await import('./build/datasources/search.js');

const log = (...a) => console.log(...a);

log('=== 1. getQuote 茅台/腾讯/英伟达 ===');
const quotes = await getQuotes(['600519', '00700', 'AAPL']);
for (const q of quotes) log(`${q.code} ${q.name} @ ${q.price} (${q.changePercent}%)`);

log('\n=== 2. searchStock("茅台") ===');
const hits1 = await searchStock('茅台', 5);
hits1.forEach((h) => log(`${h.code}  ${h.name}`));

log('\n=== 3. searchStock("GZMT" 拼音) ===');
const hits2 = await searchStock('GZMT', 5);
hits2.forEach((h) => log(`${h.code}  ${h.name}`));

log('\n=== 4. getKline(600519, 10根日线) ===');
const k = await getKline('600519', 10, 'day');
k.slice(-3).forEach((c) => log(`${c.date} O:${c.open} C:${c.close} H:${c.high} L:${c.low}`));
log('... 共', k.length, '根');
