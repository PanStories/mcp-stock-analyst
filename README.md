# MCP Stock Analyst 📈

一个提供 **A股 / 港股 / 美股** 行情数据的 MCP (Model Context Protocol) 服务器。

- **零成本运行**：基于腾讯免费行情接口，无需任何 API key，无配额限制
- **三个实用工具**：实时报价、智能搜索（支持中文/拼音/代码）、历史K线
- **双传输模式**：`stdio`（本地/桌面客户端）+ `Streamable HTTP`（远程托管，Apify Standby）
- **可托管上线**：部署到 Apify Standby，得到一个常驻的远程 MCP 端点，全球客户端可接入

## 工具列表

| 工具 | 功能 | 示例输入 |
|---|---|---|
| `get_quote` | 实时报价（A股/港股/美股，支持批量，单次最多10个） | `600519,00700,AAPL` |
| `search_stock` | 智能搜索代码/名称/拼音 | `茅台` / `GZMT` / `NVIDIA` |
| `get_kline` | 历史K线（日/周/月，20–640 根） | `600519`，period=`day` |

## 快速开始

```bash
npm install
npm run build

npm start          # stdio 模式（本地客户端 / Inspector）
npm run start:http # Streamable HTTP 模式（默认监听 0.0.0.0:3000，端点 /mcp）
```

### 本地调试（MCP Inspector）

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

浏览器自动打开调试界面，可直接调用三个工具测试。

### 端到端测试

```bash
node e2e-test.mjs       # stdio 协议：initialize → tools/list → tools/call
node http-e2e-test.mjs  # HTTP 协议：就绪探针 + 三个工具的完整调用链
```

### 接入本地 MCP 客户端（Claude Desktop / Cherry Studio / 5ire 等）

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

## HTTP 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/mcp` | MCP 协议端点（Streamable HTTP，无状态） |
| GET | `/health` | 健康检查 |
| GET | `/` | 服务信息；带 `x-apify-container-server-readiness-probe` 头时作为容器就绪探针响应 |

端口读取顺序：`ACTOR_WEB_SERVER_PORT` → `APIFY_CONTAINER_PORT` → `PORT` → `3000`。

## 部署到 Apify（推荐路线）

**为什么选 Apify：** Standby 模式让 Actor 常驻运行并转发 HTTP 请求，平台负责扩缩容、日志、网络与客户端认证；免费额度每月 $5，本 server 单次请求只做一次上游 HTTP 调用，成本极低。

### 1. 前置

```bash
npm install -g apify-cli
apify login          # 浏览器登录 Apify 账号
```

### 2. 推送并构建

```bash
cd mcp-stock-analyst
apify push           # 把项目推成 Actor，平台侧构建 Docker 镜像
```

### 3. 开启 Standby

在 Apify Console 打开该 Actor → **Settings → Standby**，确认 Standby 已启用（`.actor/actor.json` 里已配置 `usesStandbyMode: true`），并按需调整常驻实例数与空闲超时。

### 4. 拿到 MCP 端点

Standby URL 形如：

```
https://<username>--mcp-stock-analyst.apify.actor/mcp
```

> 实际地址以 Console 中该 Actor 的 **Endpoints** 标签页显示为准（部分 Actor 使用不同的主机名格式，不要凭用户名硬拼）。

### 5. 客户端接入

Standby 端点需要 Apify API token 认证，最省事的方式是通过 `mcp-remote` 代理：

```json
{
  "mcpServers": {
    "stock-analyst": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://<username>--mcp-stock-analyst.apify.actor/mcp",
        "--header",
        "Authorization: Bearer ${APIFY_TOKEN}"
      ],
      "env": { "APIFY_TOKEN": "<your-apify-api-token>" }
    }
  }
}
```

token 在 Apify Console → **Settings → API & Integrations** 获取。

### 6. 变现（可选）

Apify 支持 **Pay Per Event** 计费：在 Actor 的 Monetization 设置里定义事件（例如每次工具调用 $0.05），并在代码中触发计费事件。当前版本未接入计费，如需按次收费可在此基础上加一层。

## 其他分发渠道（可选）

- **Smithery**：`smithery.yaml` 已就绪（stdio 模式），执行 `npx @smithery/cli login && npx @smithery/cli deploy` 可上架。
- **mcp.so**：目录收录站，提交 GitHub 仓库地址即可，人工审核 1–3 天。

> 说明：MCP 已废弃旧的 HTTP+SSE 传输（Apify 于 2026-04-01 下线 SSE 支持），本项目远程模式使用现行的 **Streamable HTTP**。

## 技术栈

- **运行时**：Node.js ≥ 18（内置 fetch）
- **语言**：TypeScript
- **MCP SDK**：`@modelcontextprotocol/sdk`（官方，Streamable HTTP transport）
- **数据源**：腾讯行情接口（qt.gtimg.cn / web.ifzq.gtimg.cn / smartbox.gtimg.cn），免费无 key
- **容器**：多阶段 Dockerfile（node:20-alpine），镜像内仅保留运行时依赖

## 代码结构

```
src/
├── server.ts              # MCP server 工厂：三个工具定义（stdio / http 共用）
├── index.ts               # stdio 入口
├── http.ts                # Streamable HTTP 入口（Apify Standby / 远程）
└── datasources/
    ├── tencent.ts          # 报价/K线数据层（含代码标准化）
    └── search.ts           # 搜索数据层（内置种子表 + smartbox 兜底）

.actor/actor.json          # Apify Actor 定义（standby + webServerMcpPath=/mcp）
Dockerfile                 # Apify 构建用镜像
```

## 路线图（后续可加）

- [ ] 资金流向 / 龙虎榜（akshare）
- [ ] 财报摘要工具
- [ ] Apify Pay Per Event 计费层
- [ ] 自定义 API key 鉴权层（自托管时用）

## License

MIT
