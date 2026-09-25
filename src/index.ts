#!/usr/bin/env node
/**
 * stdio 入口 —— 本地调试 / 桌面 MCP 客户端
 * HTTP（Apify Standby / 远程）入口见 src/http.ts
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-stock-analyst] stdio server started');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
