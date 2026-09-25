/**
 * 内置 A 股常见标的速查表 + 腾讯智能搜索兜底
 * search_stock 工具的数据层
 */

import { getQuotes } from './tencent.js';

/** 常见指数/龙头股种子表（保证搜索零依赖可用），可后续扩展 */
const SEED: Array<{ code: string; name: string }> = [
  { code: 'sh000001', name: '上证指数' },
  { code: 'sz399001', name: '深证成指' },
  { code: 'sz399006', name: '创业板指' },
  { code: 'sh000300', name: '沪深300' },
  { code: 'sh000688', name: '科创50' },
  { code: 'sh600519', name: '贵州茅台' },
  { code: 'sz000001', name: '平安银行' },
  { code: 'sz300750', name: '宁德时代' },
  { code: 'sh601318', name: '中国平安' },
  { code: 'sz000858', name: '五粮液' },
  { code: 'sh600036', name: '招商银行' },
  { code: 'sz002594', name: '比亚迪' },
  { code: 'sh688981', name: '中芯国际' },
  { code: 'sh601899', name: '紫金矿业' },
  { code: 'sz002475', name: '立讯精密' },
  { code: 'sh600900', name: '长江电力' },
  { code: 'hk00700', name: '腾讯控股' },
  { code: 'usAAPL', name: '苹果' },
  { code: 'usNVDA', name: '英伟达' },
  { code: 'usTSLA', name: '特斯拉' },
  { code: 'a2305', name: '大豆期货' },
];

export interface SearchHit {
  code: string;
  name: string;
  matchedBy: string;
}

export async function searchStock(query: string, limit = 8): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  const add = (hit: SearchHit) => {
    if (!seen.has(hit.code)) {
      seen.add(hit.code);
      hits.push(hit);
    }
  };

  // 1) 种子表匹配（代码前缀或名称包含）
  for (const s of SEED) {
    if (s.code.includes(q) || s.name.toLowerCase().includes(q)) {
      add({ ...s, matchedBy: 'builtin' });
    }
    if (hits.length >= limit) return hits;
  }

  // 2) 腾讯智能搜索兜底（支持任意 A 股代码/名称/拼音）
  try {
    const url = `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(query)}&t=all`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    // 格式: v_hint="sh~600519~贵州茅台~gzmt~GP-A;sz~000001~平安银行~payh~GP-A"
    const m = text.match(/"(.+)"/);
    if (m && m[1]) {
      for (const item of m[1].split(';')) {
        const parts = item.split('~');
        // parts: [市场, 代码, 名称, 拼音, 类型]
        if (parts.length >= 3 && parts[0] && parts[1]) {
          add({
            code: `${parts[0]}${parts[1]}`,
            name: parts[2],
            matchedBy: 'smartbox',
          });
          if (hits.length >= limit) break;
        }
      }
    }
  } catch {
    // 网络失败时返回已有命中
  }

  return hits;
}

/** 验证代码有效性：能取到报价即有效 */
export async function isValidCode(code: string): Promise<boolean> {
  try {
    const quotes = await getQuotes([code]);
    return quotes.length > 0 && quotes[0].price > 0;
  } catch {
    return false;
  }
}
