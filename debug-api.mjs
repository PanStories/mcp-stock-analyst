// 调试2：K线接口正确姿势 + HK/US 完整字段
const log = (t) => console.log(t);

// K线几种 URL 变体
const variants = [
  'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,,,10,qfq',
  'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,2026-1-1,2026-12-31,10,qfq',
  'https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param=sh600519,day,,,10',
  'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,,10,qfq',
];
for (const url of variants) {
  try {
    const r = await fetch(url);
    const j = await r.json();
    const d = j?.data?.sh600519 ?? {};
    const keys = Object.keys(d);
    let found = '';
    for (const k of keys) if (Array.isArray(d[k]) && d[k].length) found = `${k}(${d[k].length})`;
    log(`${url.slice(-45)}  => keys=${JSON.stringify(keys)} 数组:${found}`);
  } catch (e) { log(`ERR ${url.slice(-30)} ${e.message}`); }
}

// HK/US 完整字段（找高低价位置）
const r2 = await fetch('https://qt.gtimg.cn/q=hk00700,usAAPL', { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t2 = await r2.text();
for (const seg of t2.split(';')) {
  const m = seg.match(/v_(\w+)="([^"]+)"/);
  if (!m) continue;
  const p = m[2].split('~');
  log(`\n${m[1]} 字段数=${p.length}`);
  [3,4,5,6,31,32,33,34,37,39,41,42,43,44,45,46,47,48].forEach((i) => {
    if (p[i] !== undefined && p[i] !== '') log(`  [${i}] = ${p[i]}`);
  });
}
