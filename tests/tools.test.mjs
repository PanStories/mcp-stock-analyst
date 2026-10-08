/**
 * MCP tool contract test — network-free.
 *
 * Satisfies M8ven's "0/N tools referenced in tests" finding and enforces that every
 * tool declares the four MCP hints (OpenAI's MCP directory hard-rejects tools missing
 * any hint). It only calls tools/list over an in-memory transport — no network.
 *
 * Runs against the compiled output (build/), so `npm test` builds first.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../build/server.js';

const EXPECTED_TOOLS = ['get_quote', 'search_stock', 'get_kline'];
const HINTS = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'];

async function connectPair() {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  await server.connect(serverT);
  const client = new Client({ name: 'contract-test', version: '0.0.0' });
  await client.connect(clientT);
  return client;
}

test('exposes all expected tools', async () => {
  const client = await connectPair();
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name);
  for (const expected of EXPECTED_TOOLS) {
    assert.ok(names.includes(expected), `expected tool ${expected} to be listed`);
  }
  assert.equal(names.length, EXPECTED_TOOLS.length, 'tool count matches');
  await client.close();
});

test('every tool declares all four boolean hints', async () => {
  const client = await connectPair();
  const { tools } = await client.listTools();
  for (const tool of tools) {
    const annotations = tool.annotations;
    assert.ok(annotations, `${tool.name} must declare annotations`);
    for (const hint of HINTS) {
      assert.equal(
        typeof annotations?.[hint],
        'boolean',
        `${tool.name}.${hint} must be an explicit boolean`,
      );
    }
    // All three tools are pure reads of public market data.
    assert.equal(annotations?.readOnlyHint, true, `${tool.name} should be readOnlyHint: true`);
    assert.equal(annotations?.destructiveHint, false, `${tool.name} should be destructiveHint: false`);
    assert.equal(annotations?.openWorldHint, false, `${tool.name} should be openWorldHint: false`);
  }
  await client.close();
});
