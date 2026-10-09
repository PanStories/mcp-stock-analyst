# Privacy Policy

**Product:** MCP Stock Analyst (MCP server)
**Operator:** PanStories
**Repository:** https://github.com/PanStories/mcp-stock-analyst
**Last updated:** 2026-10-09
**Effective date:** 2026-10-09

This policy explains what data MCP Stock Analyst ("the Service", "we") processes when
you connect to it as a Model Context Protocol (MCP) server — via the hosted endpoint
or a self-hosted build — and what we deliberately do **not** collect.

---

## 1. Summary (TL;DR)

- The Service is a **read-only** MCP server. Its tools only *read* public market data
  (real-time quotes, symbol search, K-line history) across 13 global markets.
- **No accounts, no sign-up, no cookies, no advertising or analytics trackers.**
- We do **not** sell, rent, or share your data with advertisers or data brokers.
- The only input is a **public stock symbol / market query** — no personal data is
  required or requested.
- The server is **stateless**: each request is independent, with no session and no
  user profile.
- Hosting is provided by **Apify**; platform-level processing is governed by Apify's
  own privacy policy.

---

## 2. Data we process

| Data | Source | Why we process it | Retention |
|---|---|---|---|
| Stock codes / symbol queries | You | To resolve symbols and return market data | In memory for the duration of the request only |
| Date-range / limit parameters | You | To bound K-line windows | Request duration only |
| IP address + User-Agent | Your request | Transient rate-limiting only | In-memory window; not persisted, not logged to disk |
| Apify API token | Apify gateway | Authenticates the caller at the platform edge | Not seen or stored by the Service |

## 3. What we do NOT collect

- No names, email addresses, phone numbers, or other personal identifiers.
- No trading accounts, brokerage credentials, positions, or portfolio data.
- No accounts, passwords, or credentials.
- No conversation history or tool-call content retained beyond the live request.
- No cookies, analytics, pixels, or advertising trackers.

## 4. Third parties / data recipients

To answer a query the Service fetches **public market data** from upstream providers.
Your symbol query is forwarded to them; no personal data is included.

| Recipient | Purpose | Notes |
|---|---|---|
| **Tencent Finance** (`qt.gtimg.cn`, `web.ifzq.gtimg.cn`, `smartbox.gtimg.cn`) | Quotes, K-line, symbol search | Public market endpoints |
| **Yahoo Finance** (`query1.finance.yahoo.com`) | Quotes/search for some markets | Public market endpoint |
| **Apify** (hosting) | Runs the Standby container and meters usage | Subject to Apify's privacy policy |

We do not disclose your inputs to any other third party.

## 5. Hosting and infrastructure

The hosted Service runs on Apify's Standby infrastructure. Apify may process
operational metadata (timestamps, IP, billing records) as an independent controller.
See <https://apify.com/privacy-policy>. The Service runs no database and keeps no
persistent store of user data.

## 6. Self-hosted / open-source builds

This repository is open source (MIT). When you self-host, **you** are the data
controller for anything your deployment processes. The code ships with no telemetry
that reports back to us.

## 7. Security

Transport is encrypted (TLS) at the Apify edge. All requests require the Apify
gateway bearer token. See [`SECURITY.md`](./SECURITY.md) for the threat model and
vulnerability reporting.

## 8. Children's privacy

The Service is a developer tool not directed at children, and we do not knowingly
process data from children under 16.

## 9. Your rights

Because we do not maintain user profiles or store personal data, there is generally
no personal data to access, correct, or erase. If you believe we hold data about you,
contact us (Section 11) and we will respond within 30 days.

## 10. Changes to this policy

We may update this policy as the Service evolves. Material changes will be reflected
in the "Last updated" date and, where appropriate, in the repository changelog.

## 11. Contact

Privacy questions or requests:
**Open an issue** at <https://github.com/PanStories/mcp-stock-analyst/issues>.
For security matters, see [`SECURITY.md`](./SECURITY.md).

---

## 简体中文

**产品：** MCP Stock Analyst — 全球 13 个市场的行情/K 线 MCP server
**运营方：** PanStories
**最后更新：** 2026-10-09

### 概要

- 本服务是**只读** MCP server，工具仅*读取*公开市场数据（实时行情、代码检索、
  K 线历史），覆盖 13 个全球市场。
- **无账号、无注册、无 Cookie、无广告或分析追踪。**
- 我们**不会**向广告商或数据经纪商出售、出租或共享你的数据。
- 唯一输入为**公开股票代码/市场查询**，不需要、也不索取任何个人信息。
- 服务**无状态**：每次请求独立处理，无会话、无用户画像。
- 托管由 **Apify** 提供，平台层处理受 Apify 隐私政策约束。

### 我们处理的数据

| 数据 | 来源 | 用途 | 保留 |
|---|---|---|---|
| 股票代码 / 检索词 | 调用方 | 解析代码并返回行情 | 仅请求期间驻留内存 |
| 日期范围 / limit 参数 | 调用方 | 限定 K 线窗口 | 仅请求期间 |
| IP + User-Agent | 请求 | 仅用于限流 | 内存窗口，不落盘 |
| Apify API token | Apify 网关 | 在平台边缘鉴权 | 本服务不接触、不存储 |

### 我们不收集

姓名、邮箱、电话等个人标识；交易账户、券商凭据、持仓或组合数据；账号/密码/凭据；
超出实时请求的对话或工具调用内容；Cookie 或任何第三方分析/广告追踪。

### 第三方（仅转发公开代码，不含个人信息）

- **腾讯财经**（`qt.gtimg.cn` / `web.ifzq.gtimg.cn` / `smartbox.gtimg.cn`）：行情、K 线、代码检索。
- **Yahoo Finance**（`query1.finance.yahoo.com`）：部分市场的行情与检索。
- **Apify**（托管）：运行 Standby 容器并计量。

### 自托管

本仓库为开源（MIT）。自托管时**你**即数据处理的控制者；代码不含任何回传遥测。

### 联系方式

在 <https://github.com/PanStories/mcp-stock-analyst/issues> 提交 issue。
安全事项见 [`SECURITY.md`](./SECURITY.md)。
