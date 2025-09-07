/**
 * @file src/tools/riven_attributes.ts
 *
 * @module tools/riven_attributes
 * @description
 * MCP tool that lists **Riven attributes** from Warframe.Market, suitable for building
 * filters like `positive_stats` / `negative_stats` in Riven auction searches.
 *
 * Upstream endpoint:
 *   `GET /riven/attributes`
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
 *   "params":{ "name":"wfm_riven_attributes", "arguments":{} }
 * }
 *
 * @remarks
 * - This tool exposes the upstream list of attribute objects as-is
 *   (commonly includes `url_name`, `effect`, `group`, etc., depending on the API version).
 * - Pair this with `wfm_riven_items` and `wfm_search_riven_auctions` for complete Riven workflows.
 */

import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";

/**
 * Public MCP tool name.
 * @constant
 */
export const name = "wfm_riven_attributes" as const;

/**
 * MCP tool definition for `wfm_riven_attributes`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Purpose and scope of the tool.
 * @property {object} input_schema - JSON Schema for expected arguments (empty object here).
 */
export const def: ToolDef = {
  name,
  description: "List Riven attributes (usable as positive/negative stat slugs in searches).",
  // IMPORTANT: MCP expects snake_case `input_schema`
  inputSchema: { type: "object", properties: {}, additionalProperties: false }
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Fetches and returns the Riven attributes list from Warframe.Market.
 *
 * @returns {Promise<any>} The `payload.attributes` array when present; otherwise the raw response.
 *
 * @throws {Error} If the upstream API responds with a non-2xx status (propagated by `wfmFetch`).
 *
 * @example
 * const attrs = await handler({});
 * console.log(attrs);
 */
export const handler: ToolHandler = async () => {
  const data = await wfmFetch("/riven/attributes");
  return data?.payload?.attributes ?? data;
};
