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
node http-e2e-test.mjs  # 本地 HTTP 协议：就绪探针 + 三个工具的完整调用链

# 远端（Apify Standby）冒烟测试，需 Apify token
$env:APIFY_TOKEN="apify_api_xxx"; node apify-remote-smoke.mjs
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

> 实际地址以 Console 中该 Actor 的 **Endpoints** 标签页显示为准（部分 Actor 使用不同的主机名格式，不要凭用户名硬拼）。也可以用 API 读取：`GET https://api.apify.com/v2/acts/<actorId>?token=<token>` 返回的 `data.standbyUrl` 字段就是准确地址。

**参考：已部署实例**

| 项 | 值 |
|---|---|
| Actor ID | `RfRL7Nj8f9uZtqmhc` |
| Standby URL | `https://neeenja--mcp-stock-analyst.apify.actor` |
| MCP 端点 | `https://neeenja--mcp-stock-analyst.apify.actor/mcp` |

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
        "https://neeenja--mcp-stock-analyst.apify.actor/mcp",
        "--header",
        "Authorization: Bearer ${APIFY_TOKEN}"
      ],
      "env": { "APIFY_TOKEN": "<your-apify-api-token>" }
    }
  }
}
```

token 在 Apify Console → **Settings → API & Integrations** 获取。

### 6. 计费（Pay Per Event）

本 server 已接入 Apify **Pay Per Event** 计费，按工具调用次数收费，无订阅、无月费。

| 事件名 | 触发时机 | 单价 |
|---|---|---|
| `tool-call`（主事件） | 每次行情数据调用：`get_quote` / `get_kline` | **$0.02** |
| `search-call` | 每次标的检索：`search_stock` | **$0.005** |

**不收钱的部分（重要）：** MCP 握手（`initialize`）和 `tools/list` 永远免费。客户端必须先能列出工具才谈得上使用，对发现类请求计费等于直接劝退用户。

**关于上游数据的成本结构：** 行情数据来自腾讯公开接口，本身零成本、无配额限制；用户付的是「随时可用 + 免维护 + 免申请 key」的便利，以及 A股/港股/美股三市场统一接口的封装。定价对齐了 Apify Store 上同类金融 MCP 的公开价位（$0.01–$0.05/次调用）。

**免费额度：** Apify 每个账号每月自带 $5 平台额度，按 $0.02/次算约等于每月 250 次免费行情调用；免费额度用尽后才会真正产生费用。首次设置价格有 14 天公示期，公示期内不向用户收费。

代码侧的三个约束（都在 `src/billing.ts` 里）：

1. **计费发生在工具执行之前**——上游请求一旦发出成本就已产生，等返回再收费，遇超时/报错就白干。
2. **计费失败不阻断服务**——`Actor.charge()` 异常只记日志，不会让用户吃到 500。
3. **消费上限触顶时优雅退出**——返回明确的 JSON-RPC 错误（含当前单价与提额方式），不伪装成系统故障。

> 事件名必须三处一致：`src/billing.ts` 的 `TOOL_EVENT_MAP` ↔ `.actor/pay_per_event.json` ↔ Apify Console 的 Monetization 设置。改价只改 Console（Console 是唯一账单来源，`pay_per_event.json` 只是参考 schema）。

## 上架 Apify Store（公开可搜）

上架 = 三件事：**完成收款信息 → 配置定价 → 点 Publish**。前两件是门槛，最后一件让 Actor 出现在 Store 搜索结果里。

**1. 收款信息（Console → Actor → Publication → Payout billing info）**

未配置收款信息时，连定价都保存不了（API 会报 `cannot-monetize-without-payout-billing-info`）。同一页里还要做 **Verify identity（KYC）**：上传身份证/驾照的清晰彩色照片（截图、纸质复印件、模糊照片都会被拒），审核约 2 个工作日。

**2. 配置定价（Publication → Monetization → Set up monetization）**

三步向导：**Actor pricing → Primary event → Review**。事件名、描述、单价必须与 `.actor/pay_per_event.json` 和 `src/billing.ts` 的 `TOOL_EVENT_MAP` 完全一致：

| 事件名 | 标题 | 单价 | 备注 |
|---|---|---|---|
| `tool-call` | Market data call | $0.02 | **选为主事件** |
| `search-call` | Symbol lookup | $0.005 | 检索事件 |
| `apify-actor-start` | （合成事件） | 保留默认 | 每次实例启动自动计费，Apify 补贴前 5 秒算力 |
| `apify-default-dataset-item` | （合成事件） | **删除** | 本 server 不写 dataset，留着无意义 |

另建议把 **minimal max cost per run** 设为 `0.05`，防止用户把单次运行上限调得过低、连启动成本都盖不住。

> 价格改动分「显著」与「非显著」两类：涨价/加事件/换模式需要 14 天公示期；**Actor 没有付费用户时立即生效**，降价、删事件、改描述也立即生效。显著改动每月只能提交一次且提交后不可撤销——定价想清楚再点。

**3. 点击 Publish（Publication 页 checklist）**

- **Display information**：logo（已备好：`assets/logo.png`）+ 描述
- **Monetization**：上一步配置完成
- **Sample output / Output schema**：按 Console 提示补齐
- **Actor permissions**：保持 **Limited permissions**（本 server 不需要读写你的存储）

发布后 Store 地址：`https://apify.com/neeenja/mcp-stock-analyst`。

**一个要提前知道的限制：** Apify 的 **agentic payments**（x402 / Skyfire，让没有 Apify 账号的 AI agent 自动发现并付费）目前**不支持 Standby 模式的 Actor**——官方文档明确写着 "Not use Standby mode for now. Standby support is coming later."。所以上架初期，买家必须是 Apify 账号用户；等 Apify 支持 Standby 后会自动纳入（满足 PPE + Limited permissions 即可，无需额外操作）。

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

- [x] Apify Pay Per Event 计费层（`tool-call` / `search-call`）
- [ ] 资金流向 / 龙虎榜（akshare）
- [ ] 财报摘要工具
- [ ] 自定义 API key 鉴权层（自托管时用）

## License

MIT
