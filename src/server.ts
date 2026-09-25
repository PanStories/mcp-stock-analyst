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

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'mcp-stock-analyst',
    version: '0.2.0',
  });

  // ---------- 工具 1：实时报价 ----------
  server.tool(
    'get_quote',
    'Get real-time stock quote for A-share / HK / US / Taiwan stocks. Accepts codes like "600519", "sh600519", "00700" (HK), "AAPL" (US), "2330.TW" or "tw2330" (Taiwan TWSE/TPEx). Multiple codes separated by comma.',
    { codes: z.string().describe('Stock code(s), comma separated, e.g. "600519,00700,AAPL,2330.TW"') },
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
          // 台湾（Yahoo）不提供成交额，只报成交量
          return q.market === 'tw'
            ? `${head}  成交 ${Math.round(q.volume / 1e4) / 1e2} 万股`
            : `${head}  成交 ${q.volume} 股 / ${Math.round(q.turnover / 1e8 * 100) / 100} 亿`;
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
    'Search stock code/name across A-share / HK / US / Taiwan markets. Supports Chinese name, pinyin abbreviation, partial code, or English name. Returns matched stocks with codes.',
    {
      query: z.string().describe('Search keyword, e.g. "茅台", "GZMT", "600", "Tesla", "台积电", "TSMC", "2330"'),
      limit: z.number().optional().default(8).describe('Max results (default 8)'),
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
    'Get historical K-line (candlestick) data for a stock (A-share / HK / US / Taiwan). Day/week/month periods, up to 640 bars.',
    {
      code: z.string().describe('Stock code, e.g. "600519", "sh600519" or "2330.TW" (Taiwan)'),
      days: z.number().optional().default(120).describe('Number of bars (20-640, default 120)'),
      period: z.enum(['day', 'week', 'month']).optional().default('day').describe('K-line period'),
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
