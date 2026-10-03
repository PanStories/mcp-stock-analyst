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

log('\n=== 5. 台湾报价：2330.TW / tw2454 / 5483.TWO / ^TWII ===');
const twQuotes = await getQuotes(['2330.TW', 'tw2454', '5483.TWO', '^TWII']);
for (const q of twQuotes) log(`${q.code} ${q.name} @ ${q.price} TWD (${q.changePercent}%) vol=${q.volume}`);

log('\n=== 6. 台湾K线：2330.TW 10根日线 ===');
const twk = await getKline('2330.TW', 10, 'day');
twk.slice(-3).forEach((c) => log(`${c.date} O:${c.open} C:${c.close} H:${c.high} L:${c.low}`));
log('... 共', twk.length, '根');

log('\n=== 7. searchStock("台积电") ===');
const hits3 = await searchStock('台积电', 5);
hits3.forEach((h) => log(`${h.code}  ${h.name}`));

log('\n=== 8. searchStock("TSMC" 英文) ===');
const hits4 = await searchStock('TSMC', 5);
hits4.forEach((h) => log(`${h.code}  ${h.name}`));

log('\n=== 9. searchStock("2330" 数字) ===');
const hits5 = await searchStock('2330', 5);
hits5.forEach((h) => log(`${h.code}  ${h.name}`));

log('\n=== 10. 混合市场报价：600519,AAPL,2330.TW,00700 ===');
const mixed = await getQuotes(['600519', 'AAPL', '2330.TW', '00700']);
for (const q of mixed) log(`${q.code} ${q.name} @ ${q.price} (${q.market})`);

log('\n=== 11. 全球市场报价（Yahoo）：7203.T / RELIANCE.NS / 005930.KS / HSBA.L / MC.PA / SAP.DE / RY.TO / D05.SI / 1295.KL ===');
const global = await getQuotes(['7203.T', 'RELIANCE.NS', '005930.KS', 'HSBA.L', 'MC.PA', 'SAP.DE', 'RY.TO', 'D05.SI', '1295.KL']);
for (const q of global) log(`${q.code} ${q.name} @ ${q.price} (${q.market}) vol=${q.volume}`);

log('\n=== 12. 全球K线：7203.T 8根日线 ===');
const jpk = await getKline('7203.T', 8, 'day');
jpk.slice(-3).forEach((c) => log(`${c.date} O:${c.open} C:${c.close} H:${c.high} L:${c.low}`));
log('... 共', jpk.length, '根');

log('\n=== 13. 全球搜索：Toyota / Samsung / LVMH ===');
const gsearch = await searchStock('Toyota', 5);
gsearch.forEach((h) => log(`${h.code}  ${h.name}`));
log('--- Samsung ---');
(await searchStock('Samsung', 5)).forEach((h) => log(`${h.code}  ${h.name}`));
log('--- LVMH ---');
(await searchStock('LVMH', 5)).forEach((h) => log(`${h.code}  ${h.name}`));
