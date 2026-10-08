/**
 * MCP Server 工厂 —— 三个工具的定义
 * 被两个入口复用：
 *   - src/index.ts  stdio 传输（本地调试 / 桌面客户端）
 *   - src/http.ts   Streamable HTTP 传输（Apify Standby 部署）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getQuotes, getKline } from './datasources/tencent.js';
import { searchStock } from './datasources/search.js';

/** 腾讯市场（提供成交额）；其余（台湾 + 全球）走 Yahoo，只报成交量 */
const TURNOVER_MARKETS = new Set(['sh', 'sz', 'bj', 'hk', 'us']);

/** MCP tool hints — every tool here is a pure read of public market data (no writes,
 * no side effects). Declaring the four hints is required by OpenAI's MCP directory
 * and clears the M8ven "tools missing hints" finding.
 *
 * NOTE: written INLINE on each tool (not via a shared const). M8ven's static
 * analyser does not follow `Const.prop` references and would report every tool as
 * missing its hints. */

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-stock-analyst',
    version: '0.3.1',
  });

  // ---------- 工具 1：实时报价 ----------
  server.tool(
    'get_quote',
    'Get real-time stock quote across 13 markets: China A-shares, Hong Kong, US, Taiwan, Japan, India, Canada, South Korea, UK, France, Singapore, Germany, Malaysia. Accepts codes like "600519", "00700" (HK), "AAPL" (US), "2330.TW" (Taiwan), "7203.T" (Japan), "RELIANCE.NS" (India), "005930.KS" (Korea), "HSBA.L" (UK), "MC.PA" (France), "SAP.DE" (Germany), "RY.TO" (Canada), "D05.SI" (Singapore), "1295.KL" (Malaysia). Multiple codes separated by comma.',
    { codes: z.string().describe('Stock code(s), comma separated, e.g. "600519,00700,AAPL,2330.TW"') },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ codes }) => {
      try {
        const list = codes.split(/[,，\s]+/).filter(Boolean).slice(0, 10);
        const quotes = await getQuotes(list);
        if (!quotes.length) {
          return { content: [{ type: 'text', text: `未找到标的：${codes}` }] };
        }
        const lines = quotes.map((q) => {
          const head =
            `${q.name} (${q.code})  现价 ${q.price}  ${q.change >= 0 ? '+' : ''}${q.change} (${q.changePercent}%)  ` +
            `今开 ${q.open} / 昨收 ${q.prevClose} / 最高 ${q.high} / 最低 ${q.low}`;
          // 腾讯市场（A股/港股/美股）提供成交额；Yahoo 市场（台湾 + 全球）只报成交量
          return TURNOVER_MARKETS.has(q.market)
            ? `${head}  成交 ${q.volume} 股 / ${Math.round(q.turnover / 1e8 * 100) / 100} 亿`
            : `${head}  成交量 ${(q.volume / 1e6).toFixed(2)} 百万股`;
        });
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: `获取报价失败: ${e.message}` }] };
      }
    }
  );

  // ---------- 工具 2：智能搜索 ----------
  server.tool(
    'search_stock',
    'Search stock code/name across 13 markets (China A-shares, Hong Kong, US, Taiwan, Japan, India, Canada, South Korea, UK, France, Singapore, Germany, Malaysia). Supports Chinese name, pinyin abbreviation, partial code, or English ticker. Returns matched stocks with codes.',
    {
      query: z.string().describe('Search keyword, e.g. "茅台", "GZMT", "600", "Tesla", "台积电", "TSMC", "2330"'),
      limit: z.number().optional().default(8).describe('Max results (default 8)'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ query, limit }) => {
      try {
        const hits = await searchStock(query, limit);
        if (!hits.length) {
          return { content: [{ type: 'text', text: `没有匹配 "${query}" 的标的` }] };
        }
        const text = hits.map((h) => `${h.code}  ${h.name}  (${h.matchedBy})`).join('\n');
        return { content: [{ type: 'text', text }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: `搜索失败: ${e.message}` }] };
      }
    }
  );

  // ---------- 工具 3：历史K线 ----------
  server.tool(
    'get_kline',
    'Get historical K-line (candlestick) data for a stock across 13 markets (China A-shares, Hong Kong, US, Taiwan, Japan, India, Canada, South Korea, UK, France, Singapore, Germany, Malaysia). Day/week/month periods, up to 640 bars.',
    {
      code: z.string().describe('Stock code, e.g. "600519", "sh600519" or "2330.TW" (Taiwan)'),
      days: z.number().optional().default(120).describe('Number of bars (20-640, default 120)'),
      period: z.enum(['day', 'week', 'month']).optional().default('day').describe('K-line period'),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async ({ code, days, period }) => {
      try {
        const klines = await getKline(code, days ?? 120, period ?? 'day');
        if (!klines.length) {
          return { content: [{ type: 'text', text: `未获取到K线：${code}` }] };
        }
        const head = `K线 ${klines[0].date} ~ ${klines[klines.length - 1].date}，共 ${klines.length} 根（${period}）\n日期 开 收 高 低 量`;
        const body = klines
          .map((k) => `${k.date} ${k.open} ${k.close} ${k.high} ${k.low} ${k.volume}`)
          .join('\n');
        return { content: [{ type: 'text', text: `${head}\n${body}` }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: `获取K线失败: ${e.message}` }] };
      }
    }
  );

  return server;
}
