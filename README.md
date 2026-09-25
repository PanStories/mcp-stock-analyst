# MCP Stock Analyst 📈

[English](#english) | [简体中文](#简体中文)

---

<a name="english"></a>

# MCP Stock Analyst (English)

A Model Context Protocol (**MCP**) server delivering stock market data for **China A-shares, Hong Kong, US and Taiwan markets** — live quotes, smart symbol search and historical K-lines.

- **Zero-cost data**: powered by free public market-data APIs (Tencent for A-share/HK/US, Yahoo Finance for Taiwan), no API key, no quota
- **3 practical tools**: real-time quotes (batch up to 10), fuzzy search (Chinese name / pinyin / ticker code), historical candlesticks
- **Dual transport**: `stdio` (local desktop clients) + `Streamable HTTP` (remote hosting on Apify Standby)
- **Live on Apify Store**: https://apify.com/neeenja/mcp-stock-analyst — pay-per-call, no subscription

## Tools

| Tool | What it does | Example input |
|---|---|---|
| `get_quote` | Real-time quote (A-share / HK / US / Taiwan, up to 10 symbols per call) | `600519,00700,AAPL,2330.TW` |
| `search_stock` | Fuzzy search by name, pinyin or partial code | `茅台` / `GZMT` / `NVIDIA` / `台积电` / `TSMC` |
| `get_kline` | Historical candlesticks (day/week/month, 20–640 bars) | `600519` or `2330.TW`, period=`day` |

### Taiwan stock codes

Taiwan (TWSE listed / TPEx OTC) stocks are served via Yahoo Finance. Accepted formats:

- `2330.TW` — TWSE listed (explicit)
- `5483.TWO` — TPEx OTC (explicit)
- `tw2330` — shorthand; the server auto-detects the exchange (tries `.TW` first, then `.TWO`)
- `^TWII` — Taiwan Capitalization Weighted Index (TAIEX)

## Connect (recommended: hosted endpoint)

Use the hosted MCP endpoint with any MCP client via `mcp-remote`:

```json
{
  "mcpServers": {
    "stock-analyst": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://neeenja--mcp-stock-analyst.apify.actor/mcp",
        "--header", "Authorization: Bearer ${APIFY_TOKEN}"
      ],
      "env": { "APIFY_TOKEN": "<your-apify-api-token>" }
    }
  }
}
```

Get your token from Apify Console → **Settings → API & Integrations**.

### Or run locally (stdio)

```bash
git clone https://github.com/PanStories/mcp-stock-analyst
cd mcp-stock-analyst
npm install && npm run build
```

```json
{
  "mcpServers": {
    "stock-analyst": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-stock-analyst\\build\\index.js"]
    }
  }
}
```

### Debug locally

```bash
npx @modelcontextprotocol/inspector node build/index.js   # interactive inspector
node e2e-test.mjs        # stdio protocol end-to-end test
node http-e2e-test.mjs   # local HTTP end-to-end test
```

## Pricing (pay-per-event)

No subscription, no monthly fee — you pay per tool call:

| Event | Charged when | Price |
|---|---|---|
| `tool-call` (primary) | each `get_quote` / `get_kline` call | **$0.02** |
| `search-call` | each `search_stock` call | **$0.005** |

**Always free:** the MCP handshake (`initialize`) and `tools/list`. Discovery costs nothing.

Every Apify account includes **$5 of free platform credit monthly** (~250 quote calls), so light users effectively pay nothing.

## HTTP endpoints (remote mode)

| Method | Path | Purpose |
|---|---|---|
| POST | `/mcp` | MCP protocol endpoint (stateless Streamable HTTP) |
| GET | `/health` | health check |
| GET | `/` | service info; answers the Apify container readiness probe |

## Deploying your own instance

```bash
npm install -g apify-cli
apify login
cd mcp-stock-analyst
apify push             # builds the Docker image on Apify's infrastructure
```

The Actor definition (`.actor/actor.json`) already enables **Standby mode** with MCP path `/mcp`. Your endpoint will be `https://<username>--mcp-stock-analyst.apify.actor/mcp` (verify in Console → Endpoints, or read `data.standbyUrl` from `GET https://api.apify.com/v2/acts/<actorId>?token=<token>`).

## Tech stack

- Node.js ≥ 18, TypeScript, official `@modelcontextprotocol/sdk`
- Data source: Tencent public market APIs (A-share/HK/US, free, no key) + Yahoo Finance chart API (Taiwan, free, no key)
- Multi-stage Docker build (`node:20-alpine`)

## Roadmap

- [x] Pay-per-event billing
- [x] Taiwan market support (TWSE / TPEx / TAIEX via Yahoo Finance)
- [ ] Money flow / dragon-tiger list data
- [ ] Financial report summaries
- [ ] API-key auth layer (self-hosting)

## License

MIT

---

<a name="简体中文"></a>

# MCP Stock Analyst（简体中文）

一个提供 **A股 / 港股 / 美股 / 台湾股** 行情数据的 MCP (Model Context Protocol) 服务器——实时报价、智能搜索、历史K线。

- **零成本数据源**：A股/港股/美股用腾讯免费公开行情接口，台湾股用 Yahoo Finance，均无需 API key，无配额限制
- **三个实用工具**：实时报价（单次最多 10 个标的）、智能搜索（中文名/拼音/代码）、历史K线
- **双传输模式**：`stdio`（本地桌面客户端）+ `Streamable HTTP`（Apify Standby 远程托管）
- **已上架 Apify Store**：https://apify.com/neeenja/mcp-stock-analyst —— 按次付费，无订阅

## 工具列表

| 工具 | 功能 | 示例输入 |
|---|---|---|
| `get_quote` | 实时报价（A股/港股/美股/台湾股，单次最多10个） | `600519,00700,AAPL,2330.TW` |
| `search_stock` | 智能搜索代码/名称/拼音 | `茅台` / `GZMT` / `NVIDIA` / `台积电` / `TSMC` |
| `get_kline` | 历史K线（日/周/月，20–640 根） | `600519` 或 `2330.TW`，period=`day` |

### 台湾股票代码格式

台湾股（TWSE 上市 / TPEx 上柜）走 Yahoo Finance 数据源，支持以下输入格式：

- `2330.TW` —— 上市股票（显式指定）
- `5483.TWO` —— 上柜股票（显式指定）
- `tw2330` —— 简写；服务端自动探测交易所（先试 `.TW`，再试 `.TWO`）
- `^TWII` —— 台湾加权指数（TAIEX）

## 接入方式（推荐：云端端点）

任意 MCP 客户端通过 `mcp-remote` 连接云端端点：

```json
{
  "mcpServers": {
    "stock-analyst": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://neeenja--mcp-stock-analyst.apify.actor/mcp",
        "--header", "Authorization: Bearer ${APIFY_TOKEN}"
      ],
      "env": { "APIFY_TOKEN": "<你的-Apify-token>" }
    }
  }
}
```

token 在 Apify Console → **Settings → API & Integrations** 获取。

### 或本地运行（stdio 模式）

```bash
git clone https://github.com/PanStories/mcp-stock-analyst
cd mcp-stock-analyst
npm install && npm run build
```

```json
{
  "mcpServers": {
    "stock-analyst": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-stock-analyst\\build\\index.js"]
    }
  }
}
```

### 本地调试

```bash
npx @modelcontextprotocol/inspector node build/index.js   # 交互式调试界面
node e2e-test.mjs        # stdio 协议端到端测试
node http-e2e-test.mjs   # 本地 HTTP 端到端测试
```

## 计费（按事件付费）

无订阅、无月费，按工具调用次数收费：

| 事件 | 触发时机 | 单价 |
|---|---|---|
| `tool-call`（主事件） | 每次行情数据调用：`get_quote` / `get_kline` | **$0.02** |
| `search-call` | 每次标的检索：`search_stock` | **$0.005** |

**永远免费：** MCP 握手（`initialize`）和 `tools/list`——发现类请求不计费。

每个 Apify 账号每月自带 **$5 平台免费额度**（按 $0.02/次约 250 次报价调用），轻度用户实际等于免费用。

## HTTP 端点（远程模式）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/mcp` | MCP 协议端点（无状态 Streamable HTTP） |
| GET | `/health` | 健康检查 |
| GET | `/` | 服务信息；响应 Apify 容器就绪探针 |

## 部署你自己的实例

```bash
npm install -g apify-cli
apify login
cd mcp-stock-analyst
apify push             # 在 Apify 平台侧构建 Docker 镜像
```

Actor 定义（`.actor/actor.json`）已启用 **Standby 模式**，MCP 路径 `/mcp`。端点形如 `https://<username>--mcp-stock-analyst.apify.actor/mcp`（以 Console → Endpoints 页为准，或通过 `GET https://api.apify.com/v2/acts/<actorId>?token=<token>` 返回的 `data.standbyUrl` 字段获取准确地址）。

## 技术栈

- Node.js ≥ 18、TypeScript、官方 `@modelcontextprotocol/sdk`
- 数据源：腾讯公开行情接口（A股/港股/美股，免费无 key）+ Yahoo Finance chart 接口（台湾，免费无 key）
- 多阶段 Docker 构建（`node:20-alpine`）

## 路线图

- [x] 按事件计费
- [x] 台湾市场支持（TWSE / TPEx / 加权指数，Yahoo Finance 数据源）
- [ ] 资金流向 / 龙虎榜
- [ ] 财报摘要
- [ ] 自定义 API key 鉴权层（自托管时用）

## 许可证

MIT
