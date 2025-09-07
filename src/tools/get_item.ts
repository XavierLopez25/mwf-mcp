/**
 * @file src/tools/get_item.ts
 *
 * @module tools/get_item
 * @description
 * MCP tool that retrieves **detailed metadata** for a Warframe.Market item by its `url_name`.
 *
 * It calls the Warframe.Market endpoint:
 * `GET /items/{url_name}`
 *
 * Typical fields returned in `payload.item` include:
 * - `item_name`, `url_name`
 * - `items_in_set` (components/parts)
 * - `mastery_level`, `rarity`, `trading_tax`, etc.
 *
 * Headers (applied by the shared HTTP client):
 * - `Language: <WFM_LANGUAGE>` (default: `en`)
 * - `Platform: <WFM_PLATFORM>` (default: `pc`)
 * - `Authorization: JWT <WFM_JWT>` (sent only if `WFM_JWT` is set)
 *
 * @example
 * // JSON-RPC (via tools/call):
 * {
 *   "jsonrpc":"2.0",
 *   "id":1,
 *   "method":"tools/call",
 *   "params":{
 *     "name":"wfm_get_item",
 *     "arguments":{"url_name":"loki_prime_set","language":"en"}
 *   }
 * }
 *
 * @remarks
 * - This tool returns `payload.item` when present; otherwise it falls back to the raw response `data`.
 * - The structure of `payload.item` is owned by the upstream API and can evolve without notice.
 */

import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";

/**
 * Public MCP tool name.
 * @constant
 */
export const name = "wfm_get_item" as const;

/**
 * MCP tool definition for `wfm_get_item`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Purpose and scope of the tool.
 * @property {object} input_schema - JSON Schema for expected arguments.
 */
export const def: ToolDef = {
  name,
  description:
    "Retrieve detailed item information by url_name (e.g., items_in_set, rarity, mastery rank, trading tax).",
  inputSchema: {
    type: "object",
    properties: {
      url_name: {
        type: "string",
        description:
          "Item slug used by Warframe.Market (e.g., 'loki_prime_set').",
      },
      language: {
        type: "string",
        description:
          "Overrides default Language header for this call (e.g., 'en', 'es').",
      },
    },
    required: ["url_name"],
    additionalProperties: false,
  },
};

/**
 * Local TypeScript helper for handler args (developer experience).
 * The MCP JSON Schema above is the authoritative contract.
 */
type GetItemArgs = {
  url_name: string;
  language?: string;
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Fetches `/items/{url_name}` from Warframe.Market and returns the item payload.
 *
 * @param {GetItemArgs} args - The tool arguments. See `def.input_schema` for the canonical schema.
 * @returns {Promise<any>} `payload.item` when available, otherwise the raw response `data`.
 *
 * @throws {Error} If `url_name` is missing or not a string.
 * @throws {Error} If the upstream API responds with a non-2xx status (propagated by `wfmFetch`).
 *
 * @example
 * const res = await handler({ url_name: "loki_prime_set", language: "en" });
 * console.log(res);
 */
export const handler: ToolHandler = async (args: any) => {
  const { url_name, language } = (args ?? {}) as GetItemArgs;

  if (!url_name || typeof url_name !== "string") {
    throw new Error("'url_name' (string) is required");
  }

  const data = await wfmFetch(`/items/${encodeURIComponent(url_name)}`, {
    language,
  });

  // Prefer normalized payload if present; otherwise return full raw response.
  return data?.payload?.item || data;
};
