#!/usr/bin/env node
/**
 * Streamable HTTP 入口 —— 远程托管（Apify Standby）/ 远程 MCP 客户端
 *
 * 为什么用 Streamable HTTP：
 *   MCP 已废弃旧的 HTTP+SSE 传输（Apify 于 2026-04-01 下线 SSE），
 *   现行标准是 Streamable HTTP（MCP spec 2025-03-26）。
 *
 * 端点：
 *   POST /mcp     MCP 协议端点（无状态：每个请求独立 server 实例）
 *   GET  /health  健康检查
 *   GET  /        Apify 容器就绪探针（必须响应，否则 standby run 永不 ready）
 *
 * 端口：ACTOR_WEB_SERVER_PORT > APIFY_CONTAINER_PORT > PORT > 3000
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

const PORT = Number(
  process.env.ACTOR_WEB_SERVER_PORT ?? process.env.APIFY_CONTAINER_PORT ?? process.env.PORT ?? 3000
);
const HOST = process.env.HOST ?? '0.0.0.0';
const MCP_PATH = '/mcp';

function sendJson(
  res: ServerResponse,
  status: number,
  payload: unknown,
  headers: Record<string, string> = {}
): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return undefined;
  return JSON.parse(raw);
}

const httpServer = createHttpServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  // --- Apify 容器就绪探针（必须返回响应，否则 standby run 不会被标记 ready）---
  if (path === '/') {
    const isProbe = Boolean(req.headers['x-apify-container-server-readiness-probe']);
    if (isProbe) {
      sendJson(res, 200, { status: 'ready' });
      return;
    }
    sendJson(res, 200, {
      name: 'mcp-stock-analyst',
      version: '0.1.0',
      transport: 'streamable-http',
      mcpEndpoint: MCP_PATH,
      health: '/health',
      tools: ['get_quote', 'search_stock', 'get_kline'],
    });
    return;
  }

  if (path === '/health') {
    sendJson(res, 200, { status: 'ok', uptime: Math.round(process.uptime()) });
    return;
  }

  // --- MCP 协议端点 ---
  if (path === MCP_PATH) {
    if (req.method !== 'POST') {
      // 无状态模式不支持服务端主动推送流（GET）与会话终止（DELETE）
      sendJson(
        res,
        405,
        {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method Not Allowed: stateless server accepts POST only on /mcp',
          },
          id: null,
        },
        { Allow: 'POST' }
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      // 无状态：每个请求一套独立的 server + transport，天然支持并发与冷启动
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error: any) {
      console.error('[mcp-stock-analyst] request error:', error);
      if (!res.headersSent) {
        sendJson(res, 500, {
          jsonrpc: '2.0',
          error: { code: -32603, message: `Internal server error: ${error?.message ?? error}` },
          id: null,
        });
      }
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found', mcpEndpoint: MCP_PATH });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[mcp-stock-analyst] Streamable HTTP server listening on http://${HOST}:${PORT}${MCP_PATH}`);
  console.log(`[mcp-stock-analyst] standby=${process.env.APIFY_META_ORIGIN ?? 'local'}`);
});

function shutdown(signal: string) {
  console.log(`[mcp-stock-analyst] received ${signal}, shutting down`);
  httpServer.close(() => process.exit(0));
  // 兜底：5s 内未正常关闭则强制退出
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
