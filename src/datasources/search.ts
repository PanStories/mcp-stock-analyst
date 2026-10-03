/**
 * 内置 A 股 / 台湾常见标的速查表 + 腾讯智能搜索 / Yahoo 搜索兜底
 * search_stock 工具的数据层
 */

import { getQuotes } from './tencent.js';
import { searchTwStocks, searchGlobalStocks } from './yahoo.js';

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
  // ---- 台湾市场（Yahoo 数据源，中文搜索靠种子表，Yahoo 端点不支持中文）----
  // 名称格式：英文名 · 本地中文名
  { code: '^TWII', name: 'TAIEX 台灣加權指數' },
  { code: '2330.TW', name: 'TSMC 台積電' },
  { code: '2454.TW', name: 'MediaTek 聯發科' },
  { code: '2317.TW', name: 'Hon Hai 鴻海科技' },
  { code: '2308.TW', name: 'Delta 台達電' },
  { code: '2303.TW', name: 'UMC 聯電' },
  { code: '3711.TW', name: 'ASE 日月光投控' },
  { code: '2412.TW', name: 'Chunghwa Telecom 中華電信' },
  { code: '1301.TW', name: 'Formosa Plastics 台塑' },
  { code: '1303.TW', name: 'Nan Ya Plastics 南亞塑膠' },
  { code: '1216.TW', name: 'Uni-President 統一' },
  { code: '2912.TW', name: 'President Chain Store 統一超商' },
  { code: '2603.TW', name: 'Evergreen 長榮海運' },
  { code: '2609.TW', name: 'Yang Ming 陽明海運' },
  { code: '2615.TW', name: 'Wan Hai 萬海航運' },
  { code: '2618.TW', name: 'EVA Air 長榮航空' },
  { code: '2881.TW', name: 'Fubon Financial 富邦金控' },
  { code: '2882.TW', name: 'Cathay Financial 國泰金控' },
  { code: '2886.TW', name: 'Mega Financial 兆豐金控' },
  { code: '5880.TW', name: 'Taiwan Cooperative Bank 合作金庫' },
  { code: '0050.TW', name: 'Yuanta Taiwan 50 元大台灣50' },
  { code: '0056.TW', name: 'Yuanta High Dividend 元大高股息' },
  // ---- 全球市场（Yahoo 数据源，中文搜索靠种子表，Yahoo 端点不支持中文）----
  // 名称格式：英文名 · 本地原名（日语/韩语/马来语/法语/德语等；英语系市场本地名即英文）
  { code: '7203.T', name: 'Toyota Motor トヨタ自動車' },
  { code: '6758.T', name: 'Sony Group ソニーグループ' },
  { code: '8306.T', name: 'Mitsubishi UFJ Financial Group 三菱UFJフィナンシャル・グループ' },
  { code: '6861.T', name: 'Keyence キーエンス' },
  { code: '^N225', name: 'Nikkei 225 日経平均株価' },
  { code: 'RELIANCE.NS', name: 'Reliance Industries' },
  { code: 'TCS.NS', name: 'Tata Consultancy Services' },
  { code: '^NSEI', name: 'NIFTY 50' },
  { code: 'RY.TO', name: 'Royal Bank of Canada' },
  { code: 'TD.TO', name: 'Toronto-Dominion Bank' },
  { code: '^GSPTSE', name: 'S&P/TSX Composite' },
  { code: '005930.KS', name: 'Samsung Electronics 삼성전자' },
  { code: '000660.KS', name: 'SK hynix SK하이닉스' },
  { code: '035420.KS', name: 'NAVER 네이버' },
  { code: '005380.KS', name: 'Hyundai Motor 현대자동차' },
  { code: '051910.KS', name: 'LG Chem LG화학' },
  { code: '^KS11', name: 'KOSPI 코스피' },
  { code: 'HSBA.L', name: 'HSBC Holdings' },
  { code: 'SHEL.L', name: 'Shell plc' },
  { code: '^FTSE', name: 'FTSE 100' },
  { code: 'MC.PA', name: 'LVMH (Moët Hennessy Louis Vuitton)' },
  { code: 'OR.PA', name: "L'Oréal" },
  { code: 'TTE.PA', name: 'TotalEnergies' },
  { code: 'AIR.PA', name: 'Airbus' },
  { code: 'SAN.PA', name: 'Sanofi' },
  { code: '^FCHI', name: 'CAC 40' },
  { code: 'D05.SI', name: 'DBS Group' },
  { code: '^STI', name: 'Straits Times Index' },
  { code: 'SAP.DE', name: 'SAP SE' },
  { code: 'SIE.DE', name: 'Siemens' },
  { code: 'ALV.DE', name: 'Allianz' },
  { code: 'DTE.DE', name: 'Deutsche Telekom' },
  { code: 'BMW.DE', name: 'BMW' },
  { code: '^GDAXI', name: 'DAX 40' },
  { code: '1295.KL', name: 'Public Bank Berhad' },
  { code: '1155.KL', name: 'Maybank Malayan Banking Berhad' },
  { code: '1023.KL', name: 'CIMB Group Berhad' },
  { code: '5347.KL', name: 'Tenaga Nasional Berhad' },
  { code: '6012.KL', name: 'Maxis Berhad' },
  { code: '^KLSE', name: 'FTSE Bursa Malaysia KLCI' },
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

  // 3) Yahoo 搜索兜底（台湾市场；仅 ASCII 查询，如 "TSMC" / "2330" / "MediaTek"）
  if (hits.length < limit) {
    try {
      const twHits = await searchTwStocks(query, limit - hits.length);
      for (const h of twHits) {
        add({ code: h.code, name: h.name, matchedBy: 'yahoo' });
        if (hits.length >= limit) break;
      }
    } catch {
      // 忽略，返回已有命中
    }
  }

  // 4) 全球市场 Yahoo 搜索兜底（日本/印度/加拿大/韩国/英国/法国/新加坡/德国/马来西亚；仅 ASCII 查询）
  if (hits.length < limit) {
    try {
      const gHits = await searchGlobalStocks(query, limit - hits.length);
      for (const h of gHits) {
        add({ code: h.code, name: h.name, matchedBy: 'yahoo' });
        if (hits.length >= limit) break;
      }
    } catch {
      // 忽略，返回已有命中
    }
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
