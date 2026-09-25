# MCP Stock Analyst 📈

一个提供 **A股 / 港股 / 美股** 行情数据的 MCP (Model Context Protocol) 服务器。

- **零成本运行**：基于腾讯免费行情接口，无需任何 API key，无配额限制
- **三个实用工具**：实时报价、智能搜索（支持中文/拼音/代码）、历史K线
- **即装即用**：stdio 本地运行，或部署到 Smithery 供全球 MCP 客户端安装

## 工具列表

| 工具 | 功能 | 示例输入 |
|---|---|---|
| `get_quote` | 实时报价（A股/港股/美股，支持批量） | `600519,00700,AAPL` |
| `search_stock` | 智能搜索代码/名称/拼音 | `茅台` / `GZMT` / `NVIDIA` |
| `get_kline` | 历史K线（日/周/月，最多640根） | `600519`，period=`day` |

## 快速开始

```bash
npm install
npm run build
npm start        # 启动 stdio server
```

### 本地调试（MCP Inspector）

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

浏览器自动打开调试界面，可直接调用三个工具测试。

### 任意 MCP 客户端接入（Claude Desktop / Cherry Studio / 5ire 等）

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

## 部署到 Smithery（免费托管，全球可安装）

```bash
# 1. 安装 CLI（首次）
npm install -g @smithery/cli

# 2. 构建（验证 smithery.yaml）
npx @smithery/cli build

# 3. 部署（需 GitHub 登录）
npx @smithery/cli deploy
```

部署成功后会得到形如 `@你的用户名/mcp-stock-analyst` 的标识，全球任何 MCP 客户端用户都可以通过 Smithery 注册表一键安装你的 server。

> Smithery 免费档包含托管额度，本 server 单次请求只做一次上游 HTTP 调用，成本极低。超出免费额度后再考虑付费档或自托管。

## 提交到 mcp.so（目录收录，增加曝光）

1. 把本项目推送到 GitHub 公开仓库（`git init && git push`）
2. 打开 https://mcp.so → 点击 **Submit MCP Server**
3. 填写：GitHub 仓库地址、名称 `MCP Stock Analyst`、简介、工具列表
4. 人工审核通常 1–3 天，收录后展示在目录中

## 技术栈

- **运行时**：Node.js ≥ 18（内置 fetch）
- **语言**：TypeScript
- **MCP SDK**：`@modelcontextprotocol/sdk`（官方）
- **数据源**：腾讯行情接口（qt.gtimg.cn / web.ifzq.gtimg.cn / smartbox.gtimg.cn），免费无 key

## 代码结构

```
src/
├── index.ts               # MCP server 入口 + 三个工具定义
└── datasources/
    ├── tencent.ts          # 报价/K线数据层（含代码标准化）
    └── search.ts           # 搜索数据层（内置种子表 + smartbox 兜底）
```

## 路线图（后续可加）

- [ ] 资金流向 / 龙虎榜（akshare）
- [ ] 财报摘要工具
- [ ] 自定义 API key 鉴权层（免费基础 + 付费进阶，变现用）
- [ ] Streamable HTTP 传输模式（支持更多远程客户端）

## License

MIT
