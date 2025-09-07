/**
 * @file src/tools/search_riven_auctions.ts
 *
 * @module tools/search_riven_auctions
 * @description
 * MCP tool to search **Riven auctions** on Warframe.Market with common filters such as
 * weapon slug, positive/negative attributes, ranks, rerolls, mastery, polarity, and sorting.
 *
 * Upstream endpoint:
 *   `GET /auctions/search?type=riven&...`
 *
 * Notes on query shaping:
 * - The Warframe.Market API expects certain list-like filters (e.g., `positive_stats`)
 *   as **comma-separated strings**; this tool accepts arrays and converts them.
 * - The `platform` argument is forwarded as a header override by the shared HTTP client.
 *
 * Headers (applied by the shared HTTP client):
 *  - `Language: <WFM_LANGUAGE>` (default: `en`)
 *  - `Platform: <WFM_PLATFORM>` (default: `pc`, can be overridden per-call)
 *  - `Authorization: JWT <WFM_JWT>` (only if `WFM_JWT` is set)
 *
 * @example
 * // JSON-RPC (via tools/call):
 * {
 *   "jsonrpc":"2.0",
 *   "id":1,
 *   "method":"tools/call",
 *   "params":{
 *     "name":"wfm_search_riven_auctions",
 *     "arguments":{
 *       "platform":"pc",
 *       "weapon_url_name":"lanka",
 *       "positive_stats":["critical_chance","multishot"],
 *       "negative_stats":["None"],
 *       "min_rank":8,
 *       "re_rolls_min":5,
 *       "polarity":"madurai",
 *       "sort_by":"price_asc",
 *       "buyout_policy":"direct"
 *     }
 *   }
 * }
 *
 * @returns
 * A compact object:
 * { "count": 42, "auctions": [ upstream auction objects ] }
 * 
 *
 * @remarks
 * - If you don’t pass any filters, the tool will return all Riven auctions (subject to API defaults).
 * - Combine with `wfm_riven_items` and `wfm_riven_attributes` to build robust search UIs.
 */

import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";

/**
 * Public MCP tool name.
 * @constant
 */
export const name = "wfm_search_riven_auctions" as const;

/**
 * MCP tool definition for `wfm_search_riven_auctions`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Purpose and scope of the tool.
 * @property {object} input_schema - JSON Schema for expected arguments (snake_case as required by MCP).
 */
export const def: ToolDef = {
  name,
  description:
    "Search Riven auctions with common filters (weapon_url_name, attributes, rank ranges, rerolls, mastery, polarity, sorting).",
  inputSchema: {
    type: "object",
    properties: {
      platform: {
        type: "string",
        enum: ["pc", "xbox", "ps4", "switch"],
        description: "Header Platform override for this call.",
      },
      weapon_url_name: {
        type: "string",
        description:
          "Weapon slug (use `wfm_riven_items` to discover valid values).",
      },
      positive_stats: {
        type: "array",
        items: { type: "string" },
        description:
          "Positive attribute slugs (converted to CSV for the API).",
      },
      negative_stats: {
        type: "array",
        items: { type: "string" },
        description:
          "Negative attribute slugs (use ['None'] to request no negative).",
      },
      min_rank: { type: "integer" },
      max_rank: { type: "integer" },
      re_rolls_min: { type: "integer" },
      re_rolls_max: { type: "integer" },
      mastery_rank_min: { type: "integer" },
      mastery_rank_max: { type: "integer" },
      polarity: {
        type: "string",
        enum: ["madurai", "vazarin", "naramon", "zenurik", "any"],
      },
      sort_by: {
        type: "string",
        enum: ["price_desc", "price_asc", "positive_attr_desc", "positive_attr_asc"],
      },
      buyout_policy: {
        type: "string",
        enum: ["direct", "auction_only", "both"],
        description:
          "Filter by buyout availability: direct buyout, auction-only, or both.",
      },
    },
    required: [],
    additionalProperties: false,
  },
};

/**
 * Local TypeScript helper for handler args (DX only; the JSON Schema above is canonical).
 */
type SearchRivenArgs = {
  platform?: "pc" | "xbox" | "ps4" | "switch";
  weapon_url_name?: string;
  positive_stats?: string[] | string;
  negative_stats?: string[] | string;
  min_rank?: number;
  max_rank?: number;
  re_rolls_min?: number;
  re_rolls_max?: number;
  mastery_rank_min?: number;
  mastery_rank_max?: number;
  polarity?: "madurai" | "vazarin" | "naramon" | "zenurik" | "any";
  sort_by?: "price_desc" | "price_asc" | "positive_attr_desc" | "positive_attr_asc";
  buyout_policy?: "direct" | "auction_only" | "both";
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Calls `GET /auctions/search` with `type=riven` and forwards supported filters.
 * Array-valued filters are converted to CSV strings as required by the upstream API.
 *
 * @param {SearchRivenArgs} args - Tool arguments (see `def.input_schema` for the authoritative schema).
 * @returns {Promise<{ count: number; auctions: any[] }>}
 * A compact result with total count and the list of auctions.
 *
 * @throws {Error} Propagates network/HTTP errors from the upstream API via `wfmFetch`.
 *
 * @example
 * const res = await handler({
 *   platform: "pc",
 *   weapon_url_name: "lanka",
 *   positive_stats: ["critical_chance","multishot"],
 *   negative_stats: ["None"],
 *   sort_by: "price_asc"
 * });
 * console.log(res.count);
 */
export const handler: ToolHandler = async (args: any) => {
  const {
    platform,
    weapon_url_name,
    positive_stats,
    negative_stats,
    min_rank,
    max_rank,
    re_rolls_min,
    re_rolls_max,
    mastery_rank_min,
    mastery_rank_max,
    polarity,
    sort_by,
    buyout_policy,
  } = (args ?? {}) as SearchRivenArgs;

  // Build API query; convert arrays to CSV strings.
  const query: Record<string, any> = {
    weapon_url_name,
    positive_stats: Array.isArray(positive_stats)
      ? positive_stats.join(",")
      : positive_stats,
    negative_stats: Array.isArray(negative_stats)
      ? negative_stats.join(",")
      : negative_stats,
    min_rank,
    max_rank,
    re_rolls_min,
    re_rolls_max,
    mastery_rank_min,
    mastery_rank_max,
    polarity,
    sort_by,
  };

  if (buyout_policy) {
    query["buyout_policy"] = buyout_policy;
  }

  // Perform the search (`type=riven` is mandatory for this tool).
  const data = await wfmFetch("/auctions/search", {
    platform,
    query: { type: "riven", ...query },
  });

  const auctions: any[] = data?.payload?.auctions ?? [];
  return { count: auctions.length, auctions };
};
