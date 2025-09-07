/**
 * @file src/tools/best_flips.ts
 *
 * @module tools/best_flips
 * @description
 * MCP tool that analyzes a set of Warframe.Market items and surfaces **flip opportunities** by
 * computing robust **midpoint prices** (top-k median on both buy/sell sides) and a **spread %**
 * (`(mid_buy - mid_sell) / mid_sell`). It optionally filters orders by **user status**
 * (e.g., only **ONLINE IN GAME**), **minimum reputation**, and **region** to focus on
 * realistically executable prices (liquidity + trust).
 *
 * The tool can be driven by:
 *  - An explicit list of `url_names`, or
 *  - A lightweight client-side search over `/items` via a `query` string.
 *
 * Returned results are **sorted descending by spread %** and include the computed midpoints,
 * spread, order totals, and the best quotes observed.
 *
 * @remarks
 * - This tool internally calls {@link getOrdersSummary} once **per target item**.
 * - Each `getOrdersSummary` request fetches `/items/{url_name}/orders` and performs
 *   the filtering and midpoint summarization.
 * - For API courtesy and responsiveness, keep `limit_search` modest (≤ 10–20) when using `query`.
 *
 * @example
 * // Example JSON-RPC call (via tools/call):
 * {
 *   "jsonrpc":"2.0",
 *   "id":1,
 *   "method":"tools/call",
 *   "params":{
 *     "name":"wfm_best_flips",
 *     "arguments":{
 *       "query":"prime set",
 *       "limit_search":12,
 *       "platform":"pc",
 *       "status":"ingame",
 *       "min_reputation":10,
 *       "depth":3,
 *       "min_spread_pct":0.1
 *     }
 *   }
 * }
 *
 * @internal
 * - Depends on `wfmFetch` for `/items` discovery when `query` is provided.
 * - Depends on `getOrdersSummary` for per-item order analysis and midpoints.
 */

import type { ToolDef, ToolHandler } from "../types.js";
import { wfmFetch } from "../utils/http.js";
import { getOrdersSummary } from "./get_orders.js";

/**
 * The public MCP tool name.
 * @constant
 */
export const name = "wfm_best_flips" as const;

/**
 * MCP tool definition for `wfm_best_flips`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - What the tool does and why you might use it.
 * @property {object} input_schema - JSON Schema describing expected arguments.
 */
export const def: ToolDef = {
  name,
  description:
    "Analyze items and estimate flip opportunities (spread & liquidity) with filters for user status (ingame/online), reputation, and region.",
  inputSchema: {
    type: "object",
    properties: {
      url_names: {
        type: "array",
        items: { type: "string" },
        description: "Explicit list of item slugs (url_name) to analyze.",
      },
      query: {
        type: "string",
        description:
          "Fallback search term (client-side) over /items when url_names is not provided.",
      },
      limit_search: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description:
          "How many items to consider from the client-side search (1–50).",
      },
      platform: {
        type: "string",
        enum: ["pc", "xbox", "ps4", "switch"],
        description:
          "Overrides default Platform header for underlying API calls.",
      },
      language: {
        type: "string",
        description:
          "Overrides default Language header for underlying API calls.",
      },
      status: {
        type: "string",
        enum: ["any", "online", "ingame"],
        description:
          "Filter by user status: 'ingame' ⊆ 'online' ⊆ 'any'. Use 'ingame' to require ONLINE IN GAME users.",
      },
      min_reputation: {
        type: "integer",
        description: "Minimum user reputation for included orders.",
      },
      region: {
        type: "string",
        description:
          "Region filter (e.g., 'en', 'ru'). Matches order.region or user.region.",
      },
      depth: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        description:
          "Top-k window size for robust midpoints on both sides (default 3).",
      },
      min_spread_pct: {
        type: "number",
        description:
          "Minimum spread fraction to include (e.g., 0.10 = 10%). Results below are discarded.",
      },
    },
    required: [],
    additionalProperties: false,
  },
};

/**
 * Input shape (TypeScript helper) accepted by the `wfm_best_flips` handler.
 * This is not exported since the MCP schema is canonical; it only improves local DX.
 */
type BestFlipsArgs = {
  url_names?: string[];
  query?: string;
  limit_search?: number;
  platform?: "pc" | "xbox" | "ps4" | "switch";
  language?: string;
  status?: "any" | "online" | "ingame";
  min_reputation?: number;
  region?: string;
  depth?: number;
  min_spread_pct?: number;
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Computes spread opportunities across a set of items, derived either from:
 *  - An explicit list of `url_names`, or
 *  - A search over `/items` using `query` (client-side filter, then capped by `limit_search`).
 *
 * For each target:
 *  1. Calls {@link getOrdersSummary} to fetch and summarize orders (with filters).
 *  2. Extracts midpoints (`sell`, `buy`) and computes:
 *     - `spread_abs = mid_buy - mid_sell`
 *     - `spread_pct = spread_abs / mid_sell` (if `mid_sell > 0`)
 *  3. Keeps only results where `spread_pct >= min_spread_pct`.
 *  4. Sorts the list by `spread_pct` descending.
 *
 * @param {BestFlipsArgs} args - Tool arguments. See {@link def} `input_schema` for authoritative schema.
 * @returns {Promise<{ count: number, results: Array<any> }>} A summary with `count` and a sorted `results` array.
 *
 * @throws {Error} If neither `url_names` nor `query` is provided (or the search yields no targets).
 *
 * @example
 * // Minimal example (explicit list):
 * await handler({
 *   url_names: ["loki_prime_set", "rhino_prime_set"],
 *   platform: "pc",
 *   status: "ingame",
 *   depth: 3,
 *   min_spread_pct: 0.10
 * });
 *
 * @example
 * // Using a client-side search over /items:
 * await handler({
 *   query: "prime set",
 *   limit_search: 10,
 *   platform: "pc",
 *   status: "ingame",
 *   min_reputation: 10,
 *   depth: 3
 * });
 *
 * @performance
 * - Complexity is roughly **O(N)** network calls for **N targets** (via `getOrdersSummary`).
 * - Keep `limit_search` small when using `query` to avoid overloading the API.
 * - Consider batching your usage at the caller level, or adding lightweight rate limiting.
 *
 * @edgecases
 * - If midpoint cannot be computed (no orders on one side), `spread_pct` is `null` and the item
 *   is excluded if `min_spread_pct > 0`.
 * - Very thin books can produce volatile midpoints; increase `depth` to stabilize.
 */
export const handler: ToolHandler = async (args: any) => {
  const {
    url_names,
    query,
    limit_search = 10,
    platform,
    language,
    status = "ingame",
    min_reputation,
    region,
    depth = 3,
    min_spread_pct = 0,
  } = (args ?? {}) as BestFlipsArgs;

  // Build target list from explicit slugs or client-side search over /items.
  let targets: string[] =
    Array.isArray(url_names) && url_names.length ? url_names : [];

  if (!targets.length && query) {
    const data = await wfmFetch("/items", { language });
    const items: any[] = data?.payload?.items ?? [];
    const q = String(query).toLowerCase();

    targets = items
      .filter(
        (it) =>
          it?.item_name?.toLowerCase?.().includes(q) ||
          it?.url_name?.toLowerCase?.().includes(q)
      )
      .slice(0, Math.max(1, Math.min(50, Number(limit_search) || 10)))
      .map((it) => it.url_name);
  }

  if (!targets.length) {
    throw new Error("Provide either 'url_names' or 'query'");
  }

  const results: any[] = [];

  for (const slug of targets) {
    try {
      // Delegate heavy lifting to the shared orders summarizer.
      const summary = await getOrdersSummary({
        url_name: slug,
        platform,
        language,
        status,
        min_reputation,
        region,
        depth,
        summarize: true,
      });

      const sell = summary.midpoints?.sell ?? null;
      const buy = summary.midpoints?.buy ?? null;

      const spreadAbs = (buy ?? 0) - (sell ?? 0);
      const spreadPct = sell ? spreadAbs / sell : null;

      // Enforce threshold (if provided)
      if (spreadPct !== null && spreadPct >= min_spread_pct) {
        results.push({
          url_name: slug,
          mid_sell: sell,
          mid_buy: buy,
          spread_abs: spreadAbs,
          spread_pct: spreadPct,
          totals: summary.totals,
          filters: summary.filters,
          best_sell: summary.best_sell,
          best_buy: summary.best_buy,
        });
      }
    } catch (e: any) {
      // Non-fatal: carry error per-item to aid diagnostics without failing the whole batch.
      results.push({ url_name: slug, error: e?.message || String(e) });
    }
  }

  // Highest spread opportunities first
  results.sort(
    (a, b) => (b.spread_pct ?? -Infinity) - (a.spread_pct ?? -Infinity)
  );

  return { count: results.length, results };
};
