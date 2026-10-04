# MCP Stock Analyst 📈

[English](#english) | [简体中文](#简体中文) | [繁體中文](#繁體中文) | [🌍 Local Guides](#local-market-guides)

---

<a name="english"></a>

# MCP Stock Analyst (English)

A Model Context Protocol (**MCP**) server delivering stock market data across **13 markets** — China A-shares, Hong Kong, US, Taiwan, Japan, India, Canada, South Korea, UK, France, Singapore, Germany and Malaysia — live quotes, smart symbol search and historical K-lines.

- **Zero-cost data**: powered by free public market-data APIs (Tencent for A-share/HK/US, Yahoo Finance for Taiwan), no API key, no quota
- **3 practical tools**: real-time quotes (batch up to 10), fuzzy search (Chinese name / pinyin / ticker code), historical candlesticks
- **Dual transport**: `stdio` (local desktop clients) + `Streamable HTTP` (remote hosting on Apify Standby)
- **Live on Apify Store**: https://apify.com/neeenja/mcp-stock-analyst — pay-per-call, no subscription
- **Project page**: https://panstories.github.io/mcp-stock-analyst — hosted GitHub Pages overview
- [Sartbot Featured](https://sartbot.com) — listed in the Sartbot MCP directory

## Tools

- **`get_quote`** — Real-time quote for one or many symbols (all 13 markets, up to 10 per call). Example: `600519,00700,AAPL,2330.TW,7203.T,RELIANCE.NS,005930.KS,HSBA.L,MC.PA,SAP.DE,RY.TO,D05.SI,1295.KL`
- **`search_stock`** — Fuzzy lookup by Chinese name, pinyin initials, partial code or English name. Example: `茅台` / `GZMT` / `NVIDIA` / `台积电` / `TSMC`
- **`get_kline`** — Historical candlesticks (day / week / month, 20–640 bars). Example: `600519` or `2330.TW`, period=`day`

All three tools work across every supported market — no separate tool per exchange.

## Supported markets

| Market | Example | Yahoo suffix |
|---|---|---|
| China A-shares | `600519` | — (Tencent) |
| Hong Kong | `00700` | — (Tencent) |
| United States | `AAPL` | — (Tencent) |
| Taiwan | `2330.TW` | `.TW` / `.TWO` |
| Japan | `7203.T` | `.T` |
| India | `RELIANCE.NS` | `.NS` / `.BO` |
| Canada | `RY.TO` | `.TO` / `.V` |
| South Korea | `005930.KS` | `.KS` / `.KQ` |
| United Kingdom | `HSBA.L` | `.L` |
| France | `MC.PA` | `.PA` |
| Singapore | `D05.SI` | `.SI` |
| Germany | `SAP.DE` | `.DE` / `.F` |
| Malaysia | `1295.KL` | `.KL` |

### Global stock codes (Yahoo Finance)

Everything outside mainland China / Hong Kong / US — Taiwan plus Japan, India, Canada, South Korea, UK, France, Singapore, Germany and Malaysia — is served by **Yahoo Finance** (free, no key). Use the exchange suffix shown above:

- `7203.T` — Tokyo (explicit)
- `RELIANCE.NS` / `TCS.NS` — NSE India (`.BO` = BSE)
- `RY.TO` / `TD.TO` — Toronto (`.V` = TSX Venture)
- `005930.KS` — Korea KOSPI (`.KQ` = KOSDAQ)
- `HSBA.L` — London
- `MC.PA` — Paris (Euronext)
- `D05.SI` — Singapore
- `SAP.DE` — Xetra Germany (`.F` = Frankfurt)
- `1295.KL` — Malaysia
- `^TWII`, `^N225`, `^FTSE`, `^NSEI`, `^GDAXI` … — market indices (any Yahoo index symbol works)

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
- Data source: Tencent public market APIs (A-share/HK/US, free, no key) + Yahoo Finance chart API (Taiwan + Japan/India/Canada/Korea/UK/France/Singapore/Germany/Malaysia, free, no key)
- Multi-stage Docker build (`node:20-alpine`)

## Roadmap

- [x] Pay-per-event billing
- [x] Taiwan market support (TWSE / TPEx / TAIEX via Yahoo Finance)
- [x] Global markets: Japan, India, Canada, South Korea, UK, France, Singapore, Germany, Malaysia (via Yahoo Finance)
- [ ] Money flow / dragon-tiger list data
- [ ] Financial report summaries
- [ ] API-key auth layer (self-hosting)

## License

MIT

---

<a name="简体中文"></a>

# MCP Stock Analyst（简体中文）

一个覆盖 **13 个市场** 的 MCP (Model Context Protocol) 服务器——A股/港股/美股/台股/日本/印度/加拿大/韩国/英国/法国/新加坡/德国/马来西亚——实时报价、智能搜索、历史K线。

- **零成本数据源**：A股/港股/美股用腾讯免费公开行情接口，台湾股用 Yahoo Finance，均无需 API key，无配额限制
- **三个实用工具**：实时报价（单次最多 10 个标的）、智能搜索（中文名/拼音/代码）、历史K线
- **双传输模式**：`stdio`（本地桌面客户端）+ `Streamable HTTP`（Apify Standby 远程托管）
- **已上架 Apify Store**：https://apify.com/neeenja/mcp-stock-analyst —— 按次付费，无订阅
- **项目主页**：https://panstories.github.io/mcp-stock-analyst —— GitHub Pages 概览页
- [Sartbot 精选](https://sartbot.com) —— 收录于 Sartbot MCP 目录

## 工具列表

- **`get_quote`** —— 实时报价，支持批量（13 个市场通用，单次最多 10 个）。示例：`600519,00700,AAPL,2330.TW,7203.T,RELIANCE.NS,005930.KS,HSBA.L,MC.PA,SAP.DE,RY.TO,D05.SI,1295.KL`
- **`search_stock`** —— 智能搜索：中文名/拼音首字母/部分代码/英文名。示例：`茅台` / `GZMT` / `NVIDIA` / `台积电` / `TSMC`
- **`get_kline`** —— 历史K线（日/周/月，20–640 根）。示例：`600519` 或 `2330.TW`，period=`day`

三个工具在 13 个市场通用，不需要按交易所分别调用。

## 支持的市场

| 市场 | 示例 | Yahoo 后缀 |
|---|---|---|
| A股 | `600519` | —（腾讯） |
| 港股 | `00700` | —（腾讯） |
| 美股 | `AAPL` | —（腾讯） |
| 台湾 | `2330.TW` | `.TW` / `.TWO` |
| 日本 | `7203.T` | `.T` |
| 印度 | `RELIANCE.NS` | `.NS` / `.BO` |
| 加拿大 | `RY.TO` | `.TO` / `.V` |
| 韩国 | `005930.KS` | `.KS` / `.KQ` |
| 英国 | `HSBA.L` | `.L` |
| 法国 | `MC.PA` | `.PA` |
| 新加坡 | `D05.SI` | `.SI` |
| 德国 | `SAP.DE` | `.DE` / `.F` |
| 马来西亚 | `1295.KL` | `.KL` |

### 全球股票代码格式（Yahoo Finance）

除 A股/港股/美股外的所有市场——台湾以及日本、印度、加拿大、韩国、英国、法国、新加坡、德国、马来西亚——均由 **Yahoo Finance** 提供（免费、无 key）。请使用上表对应的交易所后缀：

- `7203.T` —— 东京（显式指定）
- `RELIANCE.NS` / `TCS.NS` —— 印度 NSE（`.BO` = BSE）
- `RY.TO` / `TD.TO` —— 多伦多（`.V` = TSX Venture）
- `005930.KS` —— 韩国 KOSPI（`.KQ` = KOSDAQ）
- `HSBA.L` —— 伦敦
- `MC.PA` —— 巴黎（泛欧交易所）
- `D05.SI` —— 新加坡
- `SAP.DE` —— 德国 Xetra（`.F` = 法兰克福）
- `1295.KL` —— 马来西亚
- `^TWII`、`^N225`、`^FTSE`、`^NSEI`、`^GDAXI` … —— 市场指数（任意 Yahoo 指数符号均可）

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
- 数据源：腾讯公开行情接口（A股/港股/美股，免费无 key）+ Yahoo Finance chart 接口（台湾 + 日本/印度/加拿大/韩国/英国/法国/新加坡/德国/马来西亚，免费无 key）
- 多阶段 Docker 构建（`node:20-alpine`）

## 路线图

- [x] 按事件计费
- [x] 台湾市场支持（TWSE / TPEx / 加权指数，Yahoo Finance 数据源）
- [x] 全球市场：日本、印度、加拿大、韩国、英国、法国、新加坡、德国、马来西亚（Yahoo Finance 数据源）
- [ ] 资金流向 / 龙虎榜
- [ ] 财报摘要
- [ ] 自定义 API key 鉴权层（自托管时用）

## 许可证

MIT

---

<a name="繁體中文"></a>

# MCP Stock Analyst（繁體中文）

一個覆蓋 **13 個市場** 的 MCP (Model Context Protocol) 伺服器——A股/港股/美股/台股/日本/印度/加拿大/韓國/英國/法國/新加坡/德國/馬來西亞——即時報價、智慧搜尋、歷史K線。

- **零成本資料源**：A股/港股/美股使用騰訊免費公開行情介面，台股使用 Yahoo Finance，皆無需 API key，無配額限制
- **三個實用工具**：即時報價（單次最多 10 個標的）、智慧搜尋（中文名稱/拼音/代碼）、歷史K線
- **雙傳輸模式**：`stdio`（本機桌面用戶端）+ `Streamable HTTP`（Apify Standby 遠端託管）
- **已上架 Apify Store**：https://apify.com/neeenja/mcp-stock-analyst —— 按次計費，無訂閱
- **專案首頁**：https://panstories.github.io/mcp-stock-analyst —— GitHub Pages 概覽頁
- [Sartbot 精選](https://sartbot.com) —— 收錄於 Sartbot MCP 目錄

## 工具列表

- **`get_quote`** —— 即時報價，支援批量（13 個市場通用，單次最多 10 個）。範例：`600519,00700,AAPL,2330.TW,7203.T,RELIANCE.NS,005930.KS,HSBA.L,MC.PA,SAP.DE,RY.TO,D05.SI,1295.KL`
- **`search_stock`** —— 智慧搜尋：中文名稱/拼音首字母/部分代碼/英文名稱。範例：`茅台` / `GZMT` / `NVIDIA` / `台積電` / `TSMC`
- **`get_kline`** —— 歷史K線（日/週/月，20–640 根）。範例：`600519` 或 `2330.TW`，period=`day`

三個工具在 13 個市場通用，不需要按交易所分別呼叫。

## 支援的市場

| 市場 | 範例 | Yahoo 後綴 |
|---|---|---|
| A股 | `600519` | —（騰訊） |
| 港股 | `00700` | —（騰訊） |
| 美股 | `AAPL` | —（騰訊） |
| 台灣 | `2330.TW` | `.TW` / `.TWO` |
| 日本 | `7203.T` | `.T` |
| 印度 | `RELIANCE.NS` | `.NS` / `.BO` |
| 加拿大 | `RY.TO` | `.TO` / `.V` |
| 韓國 | `005930.KS` | `.KS` / `.KQ` |
| 英國 | `HSBA.L` | `.L` |
| 法國 | `MC.PA` | `.PA` |
| 新加坡 | `D05.SI` | `.SI` |
| 德國 | `SAP.DE` | `.DE` / `.F` |
| 馬來西亞 | `1295.KL` | `.KL` |

### 全球股票代碼格式（Yahoo Finance）

除 A股/港股/美股外的所有市場——台灣以及日本、印度、加拿大、韓國、英國、法國、新加坡、德國、馬來西亞——均由 **Yahoo Finance** 提供（免費、無 key）。請使用上表對應的交易所後綴：

- `7203.T` —— 東京（顯式指定）
- `RELIANCE.NS` / `TCS.NS` —— 印度 NSE（`.BO` = BSE）
- `RY.TO` / `TD.TO` —— 多倫多（`.V` = TSX Venture）
- `005930.KS` —— 韓國 KOSPI（`.KQ` = KOSDAQ）
- `HSBA.L` —— 倫敦
- `MC.PA` —— 巴黎（泛歐交易所）
- `D05.SI` —— 新加坡
- `SAP.DE` —— 德國 Xetra（`.F` = 法蘭克福）
- `1295.KL` —— 馬來西亞
- `^TWII`、`^N225`、`^FTSE`、`^NSEI`、`^GDAXI` … —— 市場指數（任意 Yahoo 指數符號均可）

## 連接方式（推薦：雲端端點）

任意 MCP 用戶端透過 `mcp-remote` 連接雲端端點：

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

token 在 Apify Console → **Settings → API & Integrations** 取得。

### 或本機執行（stdio 模式）

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

### 本機除錯

```bash
npx @modelcontextprotocol/inspector node build/index.js   # 互動式除錯介面
node e2e-test.mjs        # stdio 協定端對端測試
node http-e2e-test.mjs   # 本機 HTTP 端對端測試
```

## 計費（按事件付費）

無訂閱、無月費，按工具呼叫次數收費：

| 事件 | 觸發時機 | 單價 |
|---|---|---|
| `tool-call`（主事件） | 每次行情資料呼叫：`get_quote` / `get_kline` | **$0.02** |
| `search-call` | 每次標的檢索：`search_stock` | **$0.005** |

**永遠免費：** MCP 握手（`initialize`）和 `tools/list`——探索類請求不計費。

每個 Apify 帳號每月自帶 **$5 平台免費額度**（按 $0.02/次約 250 次報價呼叫），輕度用戶實際等於免費用。

## HTTP 端點（遠端模式）

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/mcp` | MCP 協定端點（無狀態 Streamable HTTP） |
| GET | `/health` | 健康檢查 |
| GET | `/` | 服務資訊；回應 Apify 容器就緒探測 |

## 部署你自己的實例

```bash
npm install -g apify-cli
apify login
cd mcp-stock-analyst
apify push             # 在 Apify 平台側建置 Docker 映像檔
```

Actor 定義（`.actor/actor.json`）已啟用 **Standby 模式**，MCP 路徑 `/mcp`。端點形如 `https://<username>--mcp-stock-analyst.apify.actor/mcp`（以 Console → Endpoints 頁為準）。

## 技術棧

- Node.js ≥ 18、TypeScript、官方 `@modelcontextprotocol/sdk`
- 資料源：騰訊公開行情介面（A股/港股/美股，免費無 key）+ Yahoo Finance chart 介面（台股 + 日本/印度/加拿大/韓國/英國/法國/新加坡/德國/馬來西亞，免費無 key）
- 多階段 Docker 建置（`node:20-alpine`）

## 路線圖

- [x] 按事件計費
- [x] 台灣市場支援（TWSE / TPEx / 加權指數，Yahoo Finance 資料源）
- [x] 全球市場：日本、印度、加拿大、韓國、英國、法國、新加坡、德國、馬來西亞（Yahoo Finance 資料源）
- [ ] 資金流向 / 龍虎榜
- [ ] 財報摘要
- [ ] 自訂 API key 驗證層（自架時用）

## 授權條款

MIT

---

<a name="local-market-guides"></a>

# Local Market Guides · 本地市場指南

Native-language quick guides for the six newly-added markets, ordered by the size of each
country's stock-market capitalization (source: WFE / World Bank 2025 totals):

**Japan (~$6.4T) → France (~$3.4T) → Germany (~$2.0T) → South Korea (~$1.7T) → Singapore (~$0.64T) → Malaysia (~$0.43T).**

Every stock below is written as **English name · native name**, and every ticker is served free
by **Yahoo Finance** (no API key). For Singapore (English-speaking), the native name is simply the
English name.

### 日本語 — 日本市場 (Japan) · ≈ $6.4T

日本の株式は **Yahoo Finance** から無料で取得できます。東京証券取引所（JPX）の銘柄には `.T` を付けます（例：`7203.T`）。

| Symbol | Name (English · 日本語) |
|---|---|
| `7203.T` | Toyota Motor · トヨタ自動車 |
| `6758.T` | Sony Group · ソニーグループ |
| `8306.T` | Mitsubishi UFJ Financial Group · 三菱UFJフィナンシャル・グループ |
| `6861.T` | Keyence · キーエンス |
| `^N225` | Nikkei 225 · 日経平均株価 |

### Français — Marché français (France) · ≈ $3.4T

Les actions françaises sont disponibles gratuitement via **Yahoo Finance**. Les titres d'Euronext Paris utilisent le suffixe `.PA` (ex. : `MC.PA`).

| Symbole | Nom (anglais · français) |
|---|---|
| `MC.PA` | LVMH (Moët Hennessy Louis Vuitton) · LVMH |
| `OR.PA` | L'Oréal · L'Oréal |
| `TTE.PA` | TotalEnergies · TotalEnergies |
| `AIR.PA` | Airbus · Airbus |
| `SAN.PA` | Sanofi · Sanofi |
| `^FCHI` | CAC 40 · CAC 40 |

### Deutsch — Deutscher Markt (Germany) · ≈ $2.0T

Deutsche Aktien erhalten Sie kostenlos über **Yahoo Finance**. Werte an Xetra / Frankfurt verwenden die Endung `.DE` (bzw. `.F` für Frankfurt; z. B. `SAP.DE`).

| Symbol | Name (englisch · deutsch) |
|---|---|
| `SAP.DE` | SAP SE · SAP SE |
| `SIE.DE` | Siemens · Siemens AG |
| `ALV.DE` | Allianz · Allianz SE |
| `DTE.DE` | Deutsche Telekom · Deutsche Telekom AG |
| `BMW.DE` | BMW · Bayerische Motoren Werke AG |
| `^GDAXI` | DAX 40 · DAX |

### 한국어 — 한국 시장 (South Korea) · ≈ $1.7T

한국 주식은 **Yahoo Finance**에서 무료로 제공됩니다. 한국거래소(KRX) 종목은 `.KS`(유가증권시장) 또는 `.KQ`(코스닥) 접미사를 사용합니다 (예: `005930.KS`).

| 심볼 | 이름 (영어 · 한국어) |
|---|---|
| `005930.KS` | Samsung Electronics · 삼성전자 |
| `000660.KS` | SK hynix · SK하이닉스 |
| `035420.KS` | NAVER · 네이버 |
| `005380.KS` | Hyundai Motor · 현대자동차 |
| `051910.KS` | LG Chem · LG화학 |
| `^KS11` | KOSPI · 코스피 |

### English — Singapore market (Singapore) · ≈ $0.64T

Singapore stocks are available free on **Yahoo Finance**. SGX main-board listings use the `.SI`
suffix (e.g. `D05.SI`). English is the native corporate language, so names appear as the English
name alone.

| Symbol | Name (English) |
|---|---|
| `D05.SI` | DBS Group |
| `O39.SI` | OCBC Bank |
| `U11.SI` | United Overseas Bank (UOB) |
| `Z74.SI` | Singtel |
| `^STI` | Straits Times Index |

### Bahasa Melayu — Pasaran Malaysia (Malaysia) · ≈ $0.43T

Saham Malaysia didapati secara percuma melalui **Yahoo Finance**. Saham Bursa Malaysia menggunakan akhiran `.KL` (cth: `1295.KL`).

| Simbol | Nama (Inggeris · Melayu) |
|---|---|
| `1295.KL` | Public Bank · Public Bank Berhad |
| `1155.KL` | Maybank · Malayan Banking Berhad |
| `1023.KL` | CIMB Group · CIMB Group Berhad |
| `5347.KL` | Tenaga Nasional · Tenaga Nasional Berhad |
| `6012.KL` | Maxis · Maxis Berhad |
| `^KLSE` | FTSE Bursa Malaysia KLCI · Indeks Komposit Kuala Lumpur |

---

## Support · 赞助 · 贊助

**EN** — **MCP Stock Analyst** is open source (MIT), ad-free, and delivers zero-API-key
quotes across A-shares / Hong Kong / US / Taiwan / Japan / India / Canada / South Korea / UK / France / Singapore / Germany / Malaysia. It is funded by the community, not by
ads. If it powers your research or agents, please support it:
- ☕ Ko-fi (the **Sponsor** ❤️ button on this repo routes here): https://ko-fi.com/panstories

**简体中文** — **MCP Stock Analyst** 开源（MIT）、无广告，提供 A股/港股/美股/台湾股/日本/印度/加拿大/韩国/英国/法国/新加坡/德国/马来西亚零 API key 行情，
由社区资助而非广告。若它支撑了你的研究或智能体，欢迎赞助：点本仓库的
**Sponsor** 按钮，或前往 Ko-fi: https://ko-fi.com/panstories

**繁體中文** — **MCP Stock Analyst** 開源（MIT）、無廣告，提供 A股/港股/美股/台股/日本/印度/加拿大/韓國/英國/法國/新加坡/德國/馬來西亞零 API key 行情，
由社群資助而非廣告。若它支撐了你的研究或智能體，歡迎贊助：點本倉庫的
**Sponsor** 按鈕，或前往 Ko-fi: https://ko-fi.com/panstories
