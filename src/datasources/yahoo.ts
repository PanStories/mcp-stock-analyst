/**
 * 全球市场行情（Yahoo Finance 免费接口）
 *
 * 覆盖：台湾(TWSE/TPEx) + 日本 / 印度 / 加拿大 / 韩国 / 英国 / 法国 / 新加坡 / 德国 / 马来西亚
 * 这些市场腾讯接口均不支持，统一走 Yahoo chart 端点（实时行情与历史K线同源，免费无 key）。
 *
 * 代码格式（Yahoo 原生符号，需带交易所后缀）：
 *   台湾   2330.TW / 5483.TWO   （或简写 tw2330 / ^TWII）
 *   日本   7203.T
 *   印度   RELIANCE.NS / 500325.BO
 *   加拿大 RY.TO / ENA.V
 *   韩国   005930.KS / 000660.KQ
 *   英国   HSBA.L
 *   法国   MC.PA
 *   新加坡 D05.SI
 *   德国   SAP.DE / BAS.F
 *   马来西亚 1295.KL
 *   指数   ^N225 / ^GSPC / ^FTSE / ^NSEI ...（任意 Yahoo 指数符号）
 */

import type { Quote, KlineItem } from './tencent.js';

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

/** Yahoo 交易所后缀 → 内部 market 标识 */
const SUFFIX_TO_MARKET: Record<string, Quote['market']> = {
  T: 'jp', NS: 'in', BO: 'in', TO: 'ca', V: 'ca',
  KS: 'kr', KQ: 'kr', L: 'uk', PA: 'fr', SI: 'sg', DE: 'de', F: 'de', KL: 'my',
  TW: 'tw', TWO: 'tw',
};

/** 各市场后缀（用于搜索过滤 / 文档） */
export const GLOBAL_SUFFIXES = Object.keys(SUFFIX_TO_MARKET);

/** 判断是否为台湾标的（tw2330 / 2330.TW / 5483.TWO / ^TWII） */
export function isTaiwanCode(input: string): boolean {
  const c = input.trim().toLowerCase();
  return (
    /^tw\d{4,6}$/.test(c) ||
    c === '^twii' ||
    /^\d{4,6}\.two?$/.test(c)
  );
}

/** 是否为"全球市场"标的（台湾 + 9 个新市场 + 指数 ^XXX） */
export function isGlobalCode(input: string): boolean {
  const c = input.trim();
  if (/^\^[\w.]+$/i.test(c)) return true;
  const ex = c.match(/\.([A-Za-z]{1,3})$/);
  if (ex && (ex[1].toUpperCase() in SUFFIX_TO_MARKET)) return true;
  return isTaiwanCode(c);
}

/** 根据 Yahoo 符号推断内部 market 标识 */
function marketFromSymbol(symbol: string): Quote['market'] {
  if (symbol.toUpperCase() === '^TWII') return 'tw';
  if (symbol.startsWith('^')) return 'ix';
  const m = symbol.match(/\.([A-Z]{1,3})$/);
  if (m && m[1] in SUFFIX_TO_MARKET) return SUFFIX_TO_MARKET[m[1]];
  return 'ix';
}

/** 单个 Yahoo 符号是否可取行情 */
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

/** 解析台湾符号（twXXXX 先试 .TW 再 .TWO） */
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

/** 把用户输入解析为 Yahoo 符号（台湾走 resolveTwSymbol，其余走后缀规则） */
export async function resolveGlobalSymbol(input: string): Promise<string | null> {
  const c = input.trim();

  if (isTaiwanCode(c)) return resolveTwSymbol(c);
  if (/^\^[\w.]+$/i.test(c)) return c.toUpperCase();

  const ex = c.match(/^([\w.]+)\.([A-Za-z]{1,3})$/i);
  if (ex) {
    const suffix = ex[2].toUpperCase();
    if (suffix in SUFFIX_TO_MARKET) return `${ex[1].toUpperCase()}.${suffix}`;
    return null;
  }

  return null;
}

/** 取单个 Yahoo 符号的实时报价 */
async function fetchYahooQuote(symbol: string): Promise<Quote | null> {
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
    code: symbol, // 如 2330.TW / 7203.T
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
    market: marketFromSymbol(symbol),
  };
}

/** 批量全球报价（台湾 + 9 个新市场，一次一个符号） */
export async function getGlobalQuotes(codes: string[]): Promise<Quote[]> {
  const quotes = await Promise.all(
    codes.map(async (code): Promise<Quote | null> => {
      const symbol = await resolveGlobalSymbol(code);
      if (!symbol) return null;
      return fetchYahooQuote(symbol);
    })
  );
  return quotes.filter((q): q is Quote => q !== null);
}

/** 台湾批量报价（兼容旧引用，等价于 getGlobalQuotes） */
export async function getTwQuotes(codes: string[]): Promise<Quote[]> {
  return getGlobalQuotes(codes);
}

/** 时间戳 -> YYYY-MM-DD（UTC，避免跨时区错位） */
function tsToDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('sv-SE', { timeZone: 'UTC' });
}

/** 取单个 Yahoo 符号的历史K线（day/week/month） */
async function fetchYahooKline(
  symbol: string,
  days = 120,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<KlineItem[]> {
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

/** 全球历史K线（台湾 + 9 个新市场） */
export async function getGlobalKline(
  code: string,
  days = 120,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<KlineItem[]> {
  const symbol = await resolveGlobalSymbol(code);
  if (!symbol) return [];
  return fetchYahooKline(symbol, days, period);
}

/** 台湾历史K线（兼容旧引用） */
export async function getTwKline(
  code: string,
  days = 120,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<KlineItem[]> {
  return getGlobalKline(code, days, period);
}

export interface TwSearchHit {
  code: string; // Yahoo 符号，如 2330.TW
  name: string;
}

/**
 * Yahoo 搜索兜底（仅 ASCII 查询；Yahoo 端点不支持中文）。
 * 结果过滤为全球市场符号（含各交易所后缀与 ^ 指数）。
 */
export async function searchGlobalStocks(query: string, limit = 8): Promise<TwSearchHit[]> {
  const q = query.trim();
  if (!q || !/^[\x20-\x7e]+$/.test(q)) return []; // 非 ASCII 直接跳过

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=30&newsCount=0`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return [];
    const json = (await res.json()) as any;

    const hits: TwSearchHit[] = [];
    for (const it of json?.quotes ?? []) {
      const symbol: string = it?.symbol ?? '';
      if (symbol.startsWith('^')) {
        hits.push({ code: symbol, name: it?.shortname ?? it?.longname ?? symbol });
      } else {
        const m = symbol.match(/\.([A-Z]{1,3})$/);
        if (m && SUFFIX_TO_MARKET[m[1]]) {
          hits.push({ code: symbol, name: it?.shortname ?? it?.longname ?? symbol });
        }
      }
      if (hits.length >= limit) break;
    }
    return hits;
  } catch {
    return [];
  }
}

/** 台湾搜索兜底（兼容旧引用，仅过滤台湾符号） */
export async function searchTwStocks(query: string, limit = 8): Promise<TwSearchHit[]> {
  const all = await searchGlobalStocks(query, limit * 3);
  const tw = all.filter((h) => /^((\d{4,6})\.TWO?|(\^TWII))$/.test(h.code));
  return tw.slice(0, limit);
}
