/**
 * @file src/tools/get_orders.ts
 *
 * @module tools/get_orders
 * @description
 * MCP tool that retrieves **buy/sell orders** for a Warframe.Market item and (optionally)
 * returns a **summarized** view with:
 *  - `best_sell` / `best_buy` quotes,
 *  - robust **midpoints** for sell & buy (top-k median),
 *  - **spread** (absolute & percent),
 *  - and **totals** (order counts).
 *
 * The tool also supports execution-oriented **filters**:
 *  - `status`: require users to be **ONLINE IN GAME** (`"ingame"`) or at least `"online"`,
 *  - `min_reputation`: ignore low-rep users,
 *  - `region`: match order/user region,
 *  - `depth`: control top-k window for midpoint stability.
 *
 * Upstream endpoint:
 *   `GET /items/{url_name}/orders` (with optional `?include=item`)
 *
 * Headers (handled by the shared HTTP client):
 *  - `Language: <WFM_LANGUAGE>` (default: `en`)
 *  - `Platform: <WFM_PLATFORM>` (default: `pc`)
 *  - `Authorization: JWT <WFM_JWT>` (only if `WFM_JWT` is set)
 *
 * @example
 * // JSON-RPC call (summarized with realistic filters)
 * {
 *   "jsonrpc":"2.0",
 *   "id":1,
 *   "method":"tools/call",
 *   "params":{
 *     "name":"wfm_get_orders",
 *     "arguments":{
 *       "url_name":"loki_prime_set",
 *       "platform":"pc",
 *       "status":"ingame",
 *       "min_reputation":10,
 *       "depth":3,
 *       "summarize":true
 *     }
 *   }
 * }
 *
 * @remarks
 * - If `summarize=false`, the tool returns raw `orders` as received (after visibility & filter pruning).
 * - Midpoints are computed as the median of the top-k prices on each side (k = `depth`, default 5).
 * - `status` filter semantics:
 *    * `"ingame"` → only users with status `"ingame"`.
 *    * `"online"` → users with `"ingame"` **or** `"online"`.
 *    * `"any"`    → no status restriction.
 */

import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";

/**
 * Public MCP tool name.
 * @constant
 */
export const name = "wfm_get_orders" as const;

/**
 * MCP tool definition for `wfm_get_orders`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Purpose and scope of the tool.
 * @property {object} input_schema - JSON Schema for expected arguments.
 */
export const def: ToolDef = {
  name,
  description:
    "Retrieve buy/sell orders for an item and platform. Optionally return summarized best prices, midpoints, spread, and totals.",
  // IMPORTANT: MCP expects snake_case `input_schema` (not `inputSchema`)
  inputSchema: {
    type: "object",
    properties: {
      url_name: {
        type: "string",
        description: "Item slug (e.g., 'loki_prime_set').",
      },
      platform: {
        type: "string",
        enum: ["pc", "xbox", "ps4", "switch"],
        description: "Header Platform override for this call.",
      },
      include_item: {
        type: "boolean",
        description: "If true, append `?include=item` to include item metadata.",
      },
      summarize: {
        type: "boolean",
        description:
          "If true (default), return best quotes, midpoints, spread, and totals instead of raw orders.",
      },
      language: {
        type: "string",
        description: "Header Language override for this call.",
      },
      status: {
        type: "string",
        enum: ["any", "online", "ingame"],
        description:
          "Filter by user status. 'ingame' requires ONLINE IN GAME; 'online' accepts ingame or online; 'any' disables filtering.",
      },
      min_reputation: {
        type: "integer",
        description: "Minimum user reputation required.",
      },
      region: {
        type: "string",
        description: "Region filter (e.g., 'en', 'ru').",
      },
      depth: {
        type: "integer",
        description:
          "Top-k window (1–10) for midpoint computation (median of first k quotes). Default 5.",
        minimum: 1,
        maximum: 10,
      },
    },
    required: ["url_name"],
    additionalProperties: false,
  },
};

/**
 * Local TypeScript helper for handler args (DX only; the JSON Schema above is canonical).
 */
type GetOrdersArgs = {
  url_name: string;
  platform?: "pc" | "xbox" | "ps4" | "switch";
  include_item?: boolean;
  summarize?: boolean;
  language?: string;
  status?: "any" | "online" | "ingame";
  min_reputation?: number;
  region?: string;
  depth?: number;
};

/**
 * @function getOrdersSummary
 * @description
 * Internal/shared implementation used by the MCP handler. Fetches orders and optionally summarizes them.
 *
 * @param {GetOrdersArgs} args - Arguments controlling fetch, filters, and summarization.
 * @returns {Promise<any>} Either `{ orders }` (when `summarize=false`) or the summary object.
 *
 * @throws {Error} If `url_name` is not provided.
 * @throws {Error} If the upstream API responds with a non-2xx status (propagated by `wfmFetch`).
 */
export async function getOrdersSummary(args: any) {
  const {
    url_name,
    platform,
    include_item = false,
    summarize = true,
    language,
    status = "any",
    min_reputation,
    region,
    depth = 5,
  } = (args ?? {}) as GetOrdersArgs;

  if (!url_name || typeof url_name !== "string") {
    throw new Error("'url_name' (string) is required");
  }

  // Fetch orders
  const data = await wfmFetch(
    `/items/${encodeURIComponent(url_name)}/orders`,
    {
      platform,
      language,
      query: include_item ? { include: "item" } : undefined,
    }
  );

  let orders: any[] = data?.payload?.orders ?? [];

  // Visibility + filters
  const statusOk = (u?: string) => {
    if (status === "any") return true;
    if (!u) return false;
    if (status === "ingame") return u === "ingame";
    if (status === "online") return u === "ingame" || u === "online";
    return true;
  };

  orders = orders.filter((o) => o.visible !== false);
  orders = orders.filter((o) => statusOk(o.user?.status));
  if (typeof min_reputation === "number") {
    orders = orders.filter(
      (o) => (o.user?.reputation ?? -Infinity) >= min_reputation
    );
  }
  if (region) {
    orders = orders.filter(
      (o) => o.region === region || o.user?.region === region
    );
  }

  // Raw mode
  if (!summarize) return { orders };

  // Split sides and sort
  const sells = orders
    .filter((o) => o.order_type === "sell")
    .sort((a, b) => a.platinum - b.platinum);

  const buys = orders
    .filter((o) => o.order_type === "buy")
    .sort((a, b) => b.platinum - a.platinum);

  const topSell = sells[0] ?? null;
  const topBuy = buys[0] ?? null;

  // Robust midpoints: median of first k quotes (top-k)
  const k = Math.max(1, Math.min(10, Number(depth) || 5));

  const mid = (arr: any[]) => {
    if (!arr.length) return null;
    const slice = arr
      .slice(0, Math.min(k, arr.length))
      .map((x) => x.platinum)
      .sort((a, b) => a - b);
    const m = Math.floor(slice.length / 2);
    return slice.length % 2 ? slice[m] : (slice[m - 1] + slice[m]) / 2;
    // Note: using median (rather than mean) reduces sensitivity to outliers.
  };

  const mid_sell = mid(sells);
  const mid_buy = mid(buys);

  const spread_abs = (mid_buy ?? 0) - (mid_sell ?? 0);
  const spread_pct = mid_sell ? spread_abs / mid_sell : null;

  return {
    best_sell: topSell
      ? {
          platinum: topSell.platinum,
          quantity: topSell.quantity,
          user: topSell.user?.ingame_name ?? topSell.user?.name ?? null,
          region: topSell.region ?? null,
          last_update: topSell.last_update,
          platform: topSell.platform,
          subtype: topSell.subtype ?? null,
          status: topSell.user?.status ?? null,
          reputation: topSell.user?.reputation ?? null,
        }
      : null,
    best_buy: topBuy
      ? {
          platinum: topBuy.platinum,
          quantity: topBuy.quantity,
          user: topBuy.user?.ingame_name ?? topBuy.user?.name ?? null,
          region: topBuy.region ?? null,
          last_update: topBuy.last_update,
          platform: topBuy.platform,
          subtype: topBuy.subtype ?? null,
          status: topBuy.user?.status ?? null,
          reputation: topBuy.user?.reputation ?? null,
        }
      : null,
    midpoints: { sell: mid_sell, buy: mid_buy },
    spread: { absolute: spread_abs, pct: spread_pct },
    totals: { sells: sells.length, buys: buys.length },
    filters: {
      status,
      min_reputation: min_reputation ?? null,
      region: region ?? null,
      depth: k,
    },
  };
}

/**
 * @function handler
 * @implements {ToolHandler}
 * @see getOrdersSummary
 */
export const handler: ToolHandler = getOrdersSummary;
