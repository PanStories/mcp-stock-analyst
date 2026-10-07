# Changelog · MCP Stock Analyst

All notable changes to this project are documented here. Three-language
summaries follow the README order: **English → 简体中文 → 繁體中文**.

---

## 0.3.1 — 2026-10-06

**English** — Fixed mojibake in Chinese stock names. `qt.gtimg.cn` replies with
`charset=GBK`, but the client decoded it as UTF-8, so every A-share / Hong Kong
name came back as `贵州茅台` → `??????`. Added a `decodeGbk()` helper (with a
latin1 fallback) so Chinese names render correctly again. No tool signatures
changed.

**简体中文** — 修复中文股票名乱码。`qt.gtimg.cn` 返回 `charset=GBK`，
此前按 UTF-8 解码，导致 A股 / 港股名称全部变成 `贵州茅台` → `??????`。
新增 `decodeGbk()`（失败回退 latin1），中文名称恢复正常显示。工具签名未变。

**繁體中文** — 修復中文股票名亂碼。`qt.gtimg.cn` 回傳 `charset=GBK`，
先前以 UTF-8 解碼，導致 A股 / 港股名稱全部變成 `贵州茅台` → `??????`。
新增 `decodeGbk()`（失敗回退 latin1），中文名稱恢復正常顯示。工具簽名未變。

The same class of bug hit search too: `smartbox.gtimg.cn` declares UTF-8 but
writes Chinese as JS escapes (`sh~600519~\u8d35...`), so `search_stock("GZMT")`
returned `sh600519 \u8d35\u5dde\u8305\u53f0`. Added `decodeJsEscapes()` in
`src/datasources/search.ts`. Tool signatures unchanged.

### Also in this release

- README: added explicit `# English / # 简体中文 / # 繁體中文` anchors and a visible
  version line, so every copy surface can be checked against one manifest.
- README: corrected the data-source line — Yahoo Finance serves Taiwan **plus**
  Japan / India / Canada / South Korea / UK / France / Singapore / Germany /
  Malaysia, not Taiwan only.
- Added `llms.txt` so agents and LLM crawlers can discover the endpoint and tools.
- Channel copy resynced to 13 markets and real pricing ($0.02 quote/K-line,
  $0.005 search).

---

## 0.3.0 — 2026-10-04

**English** — Expanded coverage from 4 to **13 markets**: added Japan, India,
Canada, South Korea, UK, France, Singapore, Germany and Malaysia via Yahoo
Finance alongside the existing Tencent feeds for A-share / HK / US / Taiwan.
Added `Dockerfile.glama` for Glama container releases.

**简体中文** — 覆盖市场从 4 个扩展到 **13 个**：新增日本、印度、加拿大、韩国、
英国、法国、新加坡、德国、马来西亚（走 Yahoo Finance），
与原有的腾讯 A股 / 港股 / 美股 / 台股通道并存。新增 `Dockerfile.glama`
以支持 Glama 容器化发布。

**繁體中文** — 覆蓋市場從 4 個擴展到 **13 個**：新增日本、印度、加拿大、韓國、
英國、法國、新加坡、德國、馬來西亞（走 Yahoo Finance），
與原有的騰訊 A股 / 港股 / 美股 / 台股通道並存。新增 `Dockerfile.glama`
以支援 Glama 容器化發布。
