/**
 * @file src/tools/search_items.ts
 *
 * @module tools/search_items
 * @description
 * MCP tool that performs a **client-side search** over the Warframe.Market `/items` list
 * and returns lightweight item entries (`id`, `url_name`, `item_name`, `thumb`).
 *
 * The search is **case-insensitive** and matches against both `item_name` and `url_name`.
 * It’s intended as a quick discovery helper to retrieve the canonical `url_name` used by
 * other tools (e.g., `wfm_get_item`, `wfm_get_orders`, etc.).
 *
 * Upstream endpoint:
 *   `GET /items`
 *
 * Headers (applied by the shared HTTP client):
 *  - `Language: <WFM_LANGUAGE>` (default: `en`)
 *  - `Platform: <WFM_PLATFORM>` (default: `pc`)
 *  - `Authorization: JWT <WFM_JWT>` (only if `WFM_JWT` is set)
 *
 * @example
 * // JSON-RPC (via tools/call):
 * {
 *   "jsonrpc":"2.0",
 *   "id":1,
 *   "method":"tools/call",
 *   "params":{
 *     "name":"wfm_search_items",
 *     "arguments":{ "query":"loki prime", "limit": 5, "language":"en" }
 *   }
 * }
 *
 * @remarks
 * - The filtering is done **locally** on the client after fetching `/items`.
 * - `limit` is clamped to `[1, 100]`.
 * - Use this tool to quickly obtain `url_name` values to pass to other tools.
 */

import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";

/**
 * Public MCP tool name.
 * @constant
 */
export const name = "wfm_search_items" as const;

/**
 * MCP tool definition for `wfm_search_items`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Purpose and behavior of the tool.
 * @property {object} input_schema - JSON Schema for expected arguments (snake_case as required by MCP).
 */
export const def: ToolDef = {
  name,
  description:
    "Search items by name using /items (client-side filter). Returns id, url_name, item_name, and thumb.",
  // IMPORTANT: MCP expects snake_case `input_schema` (not `inputSchema`)
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Case-insensitive search text (matches name or url_name).",
      },
      limit: {
        type: "integer",
        description: "Maximum results to return (1–100).",
        minimum: 1,
        maximum: 100,
      },
      language: {
        type: "string",
        description: "Overrides default Language header for this call.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

/**
 * Local TypeScript helper for handler args (developer experience).
 * The MCP JSON Schema above is the authoritative contract.
 */
type SearchItemsArgs = {
  query: string;
  limit?: number;
  language?: string;
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Fetches `GET /items`, applies a case-insensitive local filter against `item_name`
 * and `url_name`, and returns up to `limit` results (capped to 1..100).
 *
 * @param {SearchItemsArgs} args - Tool arguments. See `def.input_schema` for the canonical schema.
 * @returns {Promise<{ query: string; count: number; items: Array<{ id: string; url_name: string; item_name: string; thumb: string }> }>}
 * A compact result set for quick item discovery.
 *
 * @throws {Error} If `query` is missing or not a string.
 * @throws {Error} If the upstream API responds with a non-2xx status (propagated by `wfmFetch`).
 *
 * @example
 * const res = await handler({ query: "loki prime", limit: 5, language: "en" });
 * console.log(res.items.map(x => x.url_name));
 */
export const handler: ToolHandler = async (args: any) => {
  const { query, limit = 10, language } = (args ?? {}) as SearchItemsArgs;

  if (!query || typeof query !== "string") {
    throw new Error("'query' (string) is required");
  }

  // Fetch the catalog and filter locally.
  const data = await wfmFetch("/items", { language });
  const items: any[] = data?.payload?.items ?? [];
  const q = query.toLowerCase();

  // Clamp limit to [1, 100]
  const cap = Math.max(1, Math.min(100, Number(limit) || 10));

  const filtered = items
    .filter(
      (it) =>
        it?.item_name?.toLowerCase?.().includes(q) ||
        it?.url_name?.toLowerCase?.().includes(q)
    )
    .slice(0, cap);

  return {
    query,
    count: filtered.length,
    items: filtered.map((it) => ({
      id: it.id,
      url_name: it.url_name,
      item_name: it.item_name,
      thumb: it.thumb,
    })),
  };
};
