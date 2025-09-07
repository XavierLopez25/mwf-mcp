/**
 * @file src/tools/price_snapshot.ts
 *
 * @module tools/price_snapshot
 * @description
 * MCP convenience tool that returns a **concise price snapshot** for a given
 * Warframe.Market item: best sell/buy quotes, robust midpoints, spread, and totals.
 * Internally delegates to {@link getOrdersSummary} and forwards common execution
 * filters (e.g., require **ONLINE IN GAME** users with `status="ingame"`).
 *
 * Typical usage: quick “what’s the market right now?” queries from an LLM or agent.
 *
 * @example
 * // JSON-RPC (via tools/call):
 * {
 *   "jsonrpc":"2.0",
 *   "id":1,
 *   "method":"tools/call",
 *   "params":{
 *     "name":"wfm_price_snapshot",
 *     "arguments":{
 *       "url_name":"loki_prime_set",
 *       "platform":"pc",
 *       "status":"ingame",
 *       "depth":3
 *     }
 *   }
 * }
 *
 * @remarks
 * - Uses the same summarization algorithm as `wfm_get_orders`:
 *   - Midpoints are medians of the top-k quotes on each side (`depth` controls k).
 *   - Spread is reported both as absolute value and percentage of `mid_sell`.
 * - If you need raw orders (not summarized), call `wfm_get_orders` with `summarize=false`.
 */

import type { ToolDef, ToolHandler } from "../types.js";
import { DEFAULT_PLATFORM } from "../config.js";
import { getOrdersSummary } from "./get_orders.js";

/**
 * Public MCP tool name.
 * @constant
 */
export const name = "wfm_price_snapshot" as const;

/**
 * MCP tool definition for `wfm_price_snapshot`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Purpose and scope of the tool.
 * @property {object} input_schema - JSON Schema for expected arguments (snake_case as required by MCP).
 */
export const def: ToolDef = {
  name,
  description:
    "Convenience: return best sell/buy, midpoints, spread, and totals for one item on a platform.",
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
        description:
          "Header Platform override for this call. Defaults to server config.",
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
        minimum: 1,
        maximum: 10,
        description:
          "Top-k window for midpoint computation (median of first k quotes).",
      },
    },
    required: ["url_name"],
    additionalProperties: false,
  },
};

/**
 * Local TypeScript helper for handler args (DX only; JSON Schema above is canonical).
 */
type PriceSnapshotArgs = {
  url_name: string;
  platform?: "pc" | "xbox" | "ps4" | "switch";
  language?: string;
  status?: "any" | "online" | "ingame";
  min_reputation?: number;
  region?: string;
  depth?: number;
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Returns a compact snapshot of current market conditions for `url_name`:
 * - `best_sell` / `best_buy` (as reported by the summarizer),
 * - `midpoints.sell` / `midpoints.buy` (median-of-top-k),
 * - `spread.absolute` / `spread.pct`,
 * - `totals` (order counts),
 * - `filters` (echo of applied filters and `depth`).
 *
 * @param {PriceSnapshotArgs} args - Tool arguments. See {@link def} `input_schema` for authoritative schema.
 * @returns {Promise<{ url_name: string; platform: string; summary: any }>}
 * The snapshot payload, where `summary` mirrors the summarized shape of `wfm_get_orders`.
 *
 * @throws {Error} If `url_name` is missing.
 * @throws {Error} If the upstream API responds with a non-2xx status (propagated by `getOrdersSummary`/`wfmFetch`).
 *
 * @example
 * const snap = await handler({
 *   url_name: "loki_prime_set",
 *   platform: "pc",
 *   status: "ingame",
 *   depth: 3
 * });
 * console.log(snap.summary.best_sell, snap.summary.best_buy);
 */
export const handler: ToolHandler = async (args: any) => {
  const {
    url_name,
    platform,
    language,
    status,
    min_reputation,
    region,
    depth,
  } = (args ?? {}) as PriceSnapshotArgs;

  if (!url_name) {
    throw new Error("'url_name' is required");
  }

  // Delegate to the shared summarizer to keep logic consistent with wfm_get_orders.
  const summary = await getOrdersSummary({
    url_name,
    platform,
    language,
    status,
    min_reputation,
    region,
    depth,
    summarize: true,
  });

  return { url_name, platform: platform || DEFAULT_PLATFORM, summary };
};
