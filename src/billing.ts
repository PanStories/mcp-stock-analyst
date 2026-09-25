/**
 * Pay-per-event (PPE) 计费层
 *
 * 计费规则（与 .actor/pay_per_event.json 及 Apify Console → Monetization 三处保持一致）：
 *   - tool-call   $0.02  get_quote / get_kline  —— 真正交付行情数据
 *   - search-call $0.005 search_stock           —— 代码/名称检索，刻意定低价，方便用户先找标的
 *
 * 发现类请求（initialize / tools/list）不计费，否则 MCP 客户端连不上、用户直接流失。
 *
 * 计费时机：在工具执行前入账。上游行情接口的调用成本在请求一发出就已产生，
 * 若等工具返回再计费，遇上游超时/报错就会白干（Apify 官方也建议对无效输入计费）。
 */

import { Actor, log } from 'apify';

/** MCP 工具名 -> PPE 事件名 */
export const TOOL_EVENT_MAP: Record<string, string> = {
  get_quote: 'tool-call',
  get_kline: 'tool-call',
  search_stock: 'search-call',
};

export interface ChargeOutcome {
  /** 该工具是否属于计费工具 */
  billable: boolean;
  /** 是否成功入账 */
  charged: boolean;
  /** 用户本次运行的消费上限已触顶，应停止继续服务 */
  limitReached: boolean;
}

/** 用户消费上限触顶时的提示。Apify 要求对免费额度/上限做透明说明，且不得伪装成系统故障。 */
export const SPENDING_LIMIT_MESSAGE =
  'Spending limit reached for this Actor run. The MCP tool call was not executed. ' +
  'Raise the maximum cost per run (ACTOR_MAX_TOTAL_CHARGE_USD) in your Apify run options and retry. ' +
  'Pricing: $0.02 per quote/K-line call, $0.005 per symbol search.';

/**
 * 为一次 MCP 工具调用计费。
 * 在 Apify 平台外（本地调试 / 自托管）直接跳过，不产生任何副作用。
 */
export async function chargeToolCall(toolName: string): Promise<ChargeOutcome> {
  const eventName = TOOL_EVENT_MAP[toolName];
  if (!eventName) return { billable: false, charged: false, limitReached: false };

  // 本地开发 / 自托管：Actor.charge 没有意义，直接放行
  if (!Actor.isAtHome()) {
    return { billable: true, charged: false, limitReached: false };
  }

  try {
    const result = await Actor.charge({ eventName });
    if (result?.eventChargeLimitReached) {
      log.warning(`[billing] spending limit reached while charging "${eventName}" (${toolName})`);
      return { billable: true, charged: true, limitReached: true };
    }
    return { billable: true, charged: true, limitReached: false };
  } catch (error) {
    // 计费失败不阻断服务：宁可少收一次，也不要让用户拿到 500
    log.warning(
      `[billing] failed to charge "${eventName}" for ${toolName}: ${(error as Error)?.message ?? String(error)}`
    );
    return { billable: true, charged: false, limitReached: false };
  }
}
