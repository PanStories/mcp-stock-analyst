# Output

This Actor is a **remote MCP server**. It does not write results to the default dataset —
all output is returned synchronously to the MCP client over the Streamable HTTP endpoint
(`/mcp`) as MCP tool results (`tools/call` → `content[0].text`). The sections below
document the output of each tool so agents and humans know what to expect.

> Endpoint: `https://<username>--mcp-stock-analyst.apify.actor/mcp`
> Authentication: `Authorization: Bearer <APIFY_TOKEN>`

## `get_quote` — real-time quotes

Returns one line per requested symbol (comma-separated input, up to 10):

```
<name> (<code>)  现价 <price>  <+/-><change> (<changePercent>%)  今开 <open> / 昨收 <prevClose> / 最高 <high> / 最低 <low>  成交 <volume> 手 / <turnover> 亿
```

Example:

```
贵州茅台 (sh600519)  现价 1237  -14.24 (-1.14%)  今开 1250.01 / 昨收 1251.24 / 最高 1256.13 / 最低 1231.05  成交 3123900 手 / 38.67 亿
```

- `code` is the normalized Tencent format (`sh600519`, `sz300750`, `hk00700`, `usAAPL`).
- A-share volume is in 手 (lots, 1 lot = 100 shares); HK/US volume is in shares.
- HK quotes do not include intraday high/low from this endpoint (shown as 0).

## `search_stock` — symbol lookup

Returns up to `limit` (default 8) matches, one per line:

```
<code>  <name>  (<matchedBy>)
```

Example:

```
sz300750  宁德时代  (smartbox)
```

- `matchedBy` is `builtin` (curated index of ~20 popular tickers) or `smartbox`
  (Tencent fuzzy search, matches Chinese names, pinyin abbreviations like `GZMT`,
  and partial codes).

## `get_kline` — historical K-lines

First line is a summary header, then one line per bar (newest last), tab/space separated:

```
K线 <firstDate> ~ <lastDate>，共 <count> 根（<period>）
日期 开 收 高 低 量
<date> <open> <close> <high> <low> <volume>
```

Example:

```
K线 2026-08-14 ~ 2026-09-24，共 30 根（day）
日期 开 收 高 低 量
2026-08-14 1210.01 1215.5 1220.0 1205.02 31234
```

- `period`: `day` | `week` | `month`.
- Prices are forward-adjusted (`qfq`) where the market supports it.

## Errors

MCP errors use standard JSON-RPC `error` objects:

| code | meaning |
|---|---|
| `-32602` | invalid tool arguments (bad code / period / days) |
| `-32001` | run spending limit reached — raise `ACTOR_MAX_TOTAL_CHARGE_USD` and retry |
| `-32603` | internal error (upstream data source failure) |

## Pricing (pay-per-event)

| event | price | charged when |
|---|---|---|
| `tool-call` | $0.02 | `get_quote` / `get_kline` call |
| `search-call` | $0.005 | `search_stock` call |
| `apify-actor-start` | $0.00005 | Actor (standby) start |

`initialize` and `tools/list` are free.
