/**
 * @file src/tools/riven_items.ts
 *
 * @module tools/riven_items
 * @description
 * MCP tool that lists **items supported for Rivens** on Warframe.Market. The resulting
 * list is typically used to populate the `weapon_url_name` argument when searching
 * Riven auctions.
 *
 * Upstream endpoint:
 *   `GET /riven/items`
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
 *   "params":{ "name":"wfm_riven_items", "arguments":{} }
 * }
 *
 * @remarks
 * - This tool returns `payload.items` when present; otherwise it returns the raw response.
 * - Combine with `wfm_riven_attributes` and `wfm_search_riven_auctions` for end-to-end Riven workflows.
 */

import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";

/**
 * Public MCP tool name.
 * @constant
 */
export const name = "wfm_riven_items" as const;

/**
 * MCP tool definition for `wfm_riven_items`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Purpose and scope of the tool.
 * @property {object} input_schema - JSON Schema for expected arguments (empty object here).
 */
export const def: ToolDef = {
  name,
  description: "List Riven-supported items (used as `weapon_url_name` in Riven auction searches).",
  // IMPORTANT: MCP expects snake_case `input_schema`
  inputSchema: { type: "object", properties: {}, additionalProperties: false }
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Fetches and returns the list of Riven-supported items from Warframe.Market.
 *
 * @returns {Promise<any>} The `payload.items` array when present; otherwise the raw response.
 *
 * @throws {Error} If the upstream API responds with a non-2xx status (propagated by `wfmFetch`).
 *
 * @example
 * const items = await handler({});
 * console.log(items);
 */
export const handler: ToolHandler = async () => {
  const data = await wfmFetch("/riven/items");
  return data?.payload?.items ?? data;
};
