/**
 * Yahoo Finance 免费行情接口封装 —— 台湾股市（TWSE 上市 .TW / TPEx 上柜 .TWO）
 *
 * 腾讯接口不支持台湾本地市场（实测 qt.gtimg.cn / smartbox 均无 tw 前缀），
 * 因此台湾标的走 Yahoo chart 端点：实时行情与历史K线出自同一端点，免费无 key。
 *
 * 代码格式：
 *   - 2330.TW  / 5483.TWO   （Yahoo 原生符号，明确指定交易所）
 *   - tw2330              （简写，未知交易所时先试 .TW 再试 .TWO）
 *   - ^TWII               （台湾加权指数）
 */

import type { Quote, KlineItem } from './tencent.js';

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

/** 判断用户输入是否台湾标的 */
export function isTaiwanCode(input: string): boolean {
  const c = input.trim().toLowerCase();
  // tw2330 / ^twii / 2330.tw / 5483.two
  return (
    /^tw\d{4,6}$/.test(c) ||
    c === '^twii' ||
    /^\d{4,6}\.two?$/.test(c)
  );
}

/** 单个 Yahoo 符号是否能取到行情 */
async function symbolExists(symbol: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
      { headers: UA }
    );
    if (!res.ok) return false;
    const json = (await res.json()) as any;
    return !!json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  } catch {
    return false;
  }
}

/**
 * 把用户输入解析为 Yahoo 符号。
 * twXXXX 无法区分上市/上柜 → 先试 .TW，再试 .TWO（各一次探测请求）。
 * 解析失败返回 null。
 */
export async function resolveTwSymbol(input: string): Promise<string | null> {
  const c = input.trim();

  // 指数
  if (c.toLowerCase() === '^twii') return '^TWII';

  // 2330.TW / 5483.TWO —— 显式后缀，直接用
  const explicit = c.match(/^(\d{4,6})\.(TWO?)$/i);
  if (explicit) return `${explicit[1]}.${explicit[2].toUpperCase()}`;

  // tw2330 —— 未知交易所，探测
  const bare = c.toLowerCase().match(/^tw(\d{4,6})$/);
  if (bare) {
    for (const suffix of ['TW', 'TWO']) {
      const symbol = `${bare[1]}.${suffix}`;
      if (await symbolExists(symbol)) return symbol;
    }
    return null;
  }

  return null;
}

/** 台湾实时报价（一次一个符号，与腾讯批量接口在上层合并） */
export async function getTwQuotes(codes: string[]): Promise<Quote[]> {
  const quotes = await Promise.all(
    codes.map(async (code): Promise<Quote | null> => {
      const symbol = await resolveTwSymbol(code);
      if (!symbol) return null;

      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
        { headers: UA }
      );
      if (!res.ok) return null;
      const json = (await res.json()) as any;
      const r = json?.chart?.result?.[0];
      const m = r?.meta;
      const price = m?.regularMarketPrice;
      if (r == null || m == null || typeof price !== 'number') return null;

      // 昨收：fulldayChange 为当日涨跌额（chartPreviousClose 是窗口前收盘，不能用）
      const change =
        typeof m.fulldayChange === 'number' ? m.fulldayChange : 0;
      const prevClose = price - change;
      const changePercent =
        typeof m.fulldayChangePercent === 'number'
          ? m.fulldayChangePercent
          : prevClose > 0
            ? (change / prevClose) * 100
            : 0;

      // 开/高/低/量：优先 meta，缺失则取最后一根日K
      const q = r.indicators?.quote?.[0];
      const lastIdx = (r.timestamp ?? []).length - 1;
      const open = q?.open?.[lastIdx] ?? 0;
      const high = m.regularMarketDayHigh ?? q?.high?.[lastIdx] ?? 0;
      const low = m.regularMarketDayLow ?? q?.low?.[lastIdx] ?? 0;
      const volume = m.regularMarketVolume ?? q?.volume?.[lastIdx] ?? 0;

      return {
        code: symbol, // 如 2330.TW
        name: m.shortName ?? m.longName ?? symbol,
        price,
        change,
        changePercent,
        open,
        prevClose,
        high,
        low,
        volume, // 单位：股
        turnover: 0, // Yahoo chart 端点不提供成交额
        market: 'tw',
      };
    })
  );
  return quotes.filter((q): q is Quote => q !== null);
}

/** 时间戳 -> YYYY-MM-DD（Asia/Taipei 时区） */
function tsToDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Taipei',
  });
}

/** 台湾历史K线（day/week/month，与腾讯K线同构） */
export async function getTwKline(
  code: string,
  days = 120,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<KlineItem[]> {
  const symbol = await resolveTwSymbol(code);
  if (!symbol) return [];

  const n = Math.min(Math.max(days, 20), 640);
  const interval = period === 'day' ? '1d' : period === 'week' ? '1wk' : '1mo';
  // 交易日 -> 自然日换算系数（日K约1.6倍，周K含缓冲，月K按31天）
  const calendarFactor = period === 'day' ? 1.6 : period === 'week' ? 8 : 34;
  const now = Math.floor(Date.now() / 1000);
  const period1 = now - Math.ceil(n * calendarFactor) * 86400;

  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${now}&interval=${interval}`,
    { headers: UA }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as any;
  const r = json?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const q = r?.indicators?.quote?.[0] ?? {};

  const out: KlineItem[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const c = q.close?.[i];
    if (o == null || c == null) continue; // 停牌等造成的空bar
    out.push({
      date: tsToDate(ts[i]),
      open: o,
      close: c,
      high: q.high?.[i] ?? c,
      low: q.low?.[i] ?? c,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return out.slice(-n);
}

export interface TwSearchHit {
  code: string; // Yahoo 符号，如 2330.TW
  name: string;
}

/**
 * Yahoo 搜索兜底（仅 ASCII 查询；Yahoo 端点不支持中文）。
 * 结果过滤为台湾市场（.TW / .TWO / ^TWII）。
 */
export async function searchTwStocks(query: string, limit = 8): Promise<TwSearchHit[]> {
  const q = query.trim();
  if (!q || !/^[\x20-\x7e]+$/.test(q)) return []; // 非 ASCII 直接跳过

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=25&newsCount=0`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return [];
    const json = (await res.json()) as any;

    const hits: TwSearchHit[] = [];
    for (const it of json?.quotes ?? []) {
      const symbol: string = it?.symbol ?? '';
      if (symbol === '^TWII') {
        hits.push({ code: symbol, name: it?.shortname ?? '台湾加权指数' });
      } else {
        const m = symbol.match(/^(\d{4,6})\.TWO?$/);
        if (!m) continue;
        hits.push({ code: symbol, name: it?.shortname ?? it?.longname ?? symbol });
      }
      if (hits.length >= limit) break;
    }
    return hits;
  } catch {
    return [];
  }
}
