/**
 * 行情数据层：腾讯免费接口（qt.gtimg.cn / web.ifzq.gtimg.cn）+ Yahoo（台湾市场）
 * 无需 API key，无配额限制
 * 支持：A股(sh/sz/bj) / 港股(hk) / 美股(us) / 台湾(tw，走 Yahoo)
 */

import { isTaiwanCode, getTwQuotes, getTwKline } from './yahoo.js';

export interface Quote {
  code: string;          // 标准代码，如 sh600519
  name: string;          // 名称
  price: number;         // 最新价
  change: number;        // 涨跌额
  changePercent: number; // 涨跌幅 %
  open: number;
  prevClose: number;
  high: number;
  low: number;
  volume: number;        // 成交量（A股:手 / 港股:股 / 美股:股）
  turnover: number;      // 成交额（元/港币/美元）
  market: 'sh' | 'sz' | 'bj' | 'hk' | 'us' | 'tw';
}

/** 把用户输入的代码标准化为腾讯格式（台湾标的原样透传，由 Yahoo 层处理） */
export function normalizeCode(input: string): string {
  const code = input.trim();

  // 台湾标的：tw2330 / 2330.TW / 5483.TWO / ^TWII
  if (isTaiwanCode(code)) return code;

  // 已经带前缀 sh600519 / hk00700 / usAAPL
  const m = code.match(/^(sh|sz|bj|hk|us)([\w.]+)$/i);
  if (m) {
    const prefix = m[1].toLowerCase();
    const rest = m[2];
    // 美股代码保持大写，其余为数字
    return prefix === 'us' ? `us${rest.toUpperCase()}` : `${prefix}${rest}`;
  }

  // 纯数字：6位=A股，5位=港股，4位=港股（补前导0）
  if (/^\d+$/.test(code)) {
    if (code.length === 6) {
      if (/^(6|9)/.test(code)) return `sh${code}`;        // 60/68/90xxxx
      if (/^(0|2|3)/.test(code)) return `sz${code}`;       // 00/30/20xxxx
      return `bj${code}`;                                  // 8/4/92xxxx 北交所
    }
    if (code.length === 5) return `hk${code}`;             // 00700
    if (code.length === 4) return `hk0${code}`;            // 700 -> hk00700
    return `sz${code}`;
  }

  // 字母 = 美股 ticker（可含点，如 BRK.B）
  if (/^[A-Za-z][A-Za-z.]{0,9}$/.test(code)) {
    return `us${code.toUpperCase()}`;
  }

  return code;
}

const MARKET_MAP: Record<string, Quote['market']> = {
  sh: 'sh', sz: 'sz', bj: 'bj', hk: 'hk', us: 'us',
};

const isNum = (s: string | undefined) =>
  s !== undefined && s !== '' && !Number.isNaN(parseFloat(s));

/** 实时报价：台湾走 Yahoo，其余走腾讯（解析 v_sh600519="1~贵州茅台~600519~..." 格式） */
export async function getQuotes(codes: string[]): Promise<Quote[]> {
  const twCodes: string[] = [];
  const cnCodes: string[] = [];
  for (const c of codes) {
    if (isTaiwanCode(c)) twCodes.push(c);
    else cnCodes.push(normalizeCode(c));
  }

  const [cnQuotes, twQuotes] = await Promise.all([
    cnCodes.length ? fetchTencentQuotes(cnCodes) : Promise.resolve([]),
    twCodes.length ? getTwQuotes(twCodes) : Promise.resolve([]),
  ]);
  return [...cnQuotes, ...twQuotes];
}

/** 腾讯批量报价（A股/港股/美股） */
async function fetchTencentQuotes(normalized: string[]): Promise<Quote[]> {
  const url = `https://qt.gtimg.cn/q=${normalized.join(',')}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://gu.qq.com/' },
  });
  const text = await res.text();
  const quotes: Quote[] = [];

  const re = /v_(\w+)="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const parts = m[2].split('~');
    if (parts.length < 10 || !isNum(parts[3])) continue; // 过滤无效标的
    const fullCode = m[1];
    const market = (MARKET_MAP[fullCode.slice(0, 2)] ?? 'sh') as Quote['market'];

    const price = parseFloat(parts[3]);
    const prevClose = parseFloat(parts[4]);
    const open = parseFloat(parts[5]);
    const volume = parseFloat(parts[6]) || 0;

    // A股 volume 单位是手 -> 转股
    const volumeAdjusted = market === 'sh' || market === 'sz' || market === 'bj'
      ? volume * 100
      : volume;

    // 涨跌额/涨跌幅：优先取接口字段，缺失则用 price-prevClose 推导
    const change = isNum(parts[31]) ? parseFloat(parts[31]) : price - prevClose;
    const changePercent = isNum(parts[32])
      ? parseFloat(parts[32])
      : prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    // 高/低：A股与美股在 [33]/[34]，港股该端点不提供（为0）
    const high = isNum(parts[33]) ? parseFloat(parts[33]) : 0;
    const low = isNum(parts[34]) ? parseFloat(parts[34]) : 0;

    // 成交额：A股 [37] 单位是"万"，港股/美股是全额
    const turnoverRaw = isNum(parts[37]) ? parseFloat(parts[37]) : 0;
    const turnover =
      market === 'sh' || market === 'sz' || market === 'bj'
        ? turnoverRaw * 10000
        : turnoverRaw;

    quotes.push({
      code: fullCode,
      name: parts[1],
      price, prevClose, open,
      volume: volumeAdjusted,
      high, low, change, changePercent, turnover,
      market,
    });
  }
  return quotes;
}

export interface KlineItem {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/**
 * K线：台湾走 Yahoo，其余走腾讯 web.ifzq.gtimg.cn
 * 腾讯正确参数：param=<code>,<period>,<start>,<end>,<count>,qfq
 * 返回 key 为 `qfq<period>`（fqkline端点）或 `<period>`（kline端点）
 */
export async function getKline(
  code: string,
  days = 120,
  period: 'day' | 'week' | 'month' = 'day'
): Promise<KlineItem[]> {
  if (isTaiwanCode(code)) return getTwKline(code, days, period);

  const full = normalizeCode(code);
  const n = Math.min(Math.max(days, 20), 640);
  // 实测可用格式：param=sh600519,day,,,10,qfq（start/end 留空）
  const finalUrl =
    `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${full},${period},,,${n},qfq`;

  const res = await fetch(finalUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const json = (await res.json()) as any;

  const node = json?.data?.[full];
  const data: any[] = node?.[`qfq${period}`] ?? node?.[period] ?? [];
  return data.slice(-n).map((d: any[]) => ({
    date: String(d[0]),
    open: Number(d[1]),
    close: Number(d[2]),
    high: Number(d[3]),
    low: Number(d[4]),
    volume: Number(d[5] ?? 0),
  }));
}
