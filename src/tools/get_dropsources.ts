/**
 * @file src/tools/get_dropsources.ts
 *
 * @module tools/get_dropsources
 * @description
 * MCP tool that retrieves **drop sources** for a given Warframe.Market item.
 *
 * It calls the Warframe.Market endpoint:
 * `GET /items/{url_name}/dropsources?include=item` (optional `include=item`)
 *
 * Headers (handled by the shared HTTP client):
 * - `Language: <WFM_LANGUAGE>` (default: `en`)
 * - `Platform: <WFM_PLATFORM>` (default: `pc`)
 * - `Authorization: JWT <WFM_JWT>` (only if `WFM_JWT` is set)
 *
 * @example
 * // JSON-RPC (via tools/call):
 * {
 *   "jsonrpc":"2.0",
 *   "id":1,
 *   "method":"tools/call",
 *   "params":{
 *     "name":"wfm_get_dropsources",
 *     "arguments":{"url_name":"loki_prime_set","language":"en","include_item":true}
 *   }
 * }
 *
 * @remarks
 * - This tool returns the API payload as-is (`payload.dropsources`) when present;
 *   otherwise it returns the raw `data`. The structure of individual drop sources
 *   is determined by the upstream API and may evolve over time.
 * - If `include_item=true`, the API may include additional item metadata alongside
 *   the drop sources (depends on the backend).
 */

import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";

/**
 * The public MCP tool name.
 * @constant
 */
export const name = "wfm_get_dropsources" as const;

/**
 * MCP tool definition for `wfm_get_dropsources`.
 *
 * @property {string} name - Tool name.
 * @property {string} description - Tool purpose and behavior.
 * @property {object} input_schema - JSON Schema specifying expected arguments.
 */
export const def: ToolDef = {
  name,
  description: "Retrieve drop sources for a given item (optionally include basic item data).",
  inputSchema: {
    type: "object",
    properties: {
      url_name: { type: "string", description: "Item slug used by Warframe.Market (e.g., 'loki_prime_set')." },
      include_item: { type: "boolean", description: "If true, request the API to include basic item data." },
      language: { type: "string", description: "Overrides default Language header for this call." }
    },
    required: ["url_name"],
    additionalProperties: false
  }
};

/**
 * Local TypeScript helper for handler args (DX only; schema above is canonical).
 */
type GetDropSourcesArgs = {
  url_name: string;
  include_item?: boolean;
  language?: string;
};

/**
 * @function handler
 * @implements {ToolHandler}
 *
 * @description
 * Fetches drop sources for the specified `url_name` from Warframe.Market.
 *
 * - Builds the request to `/items/{url_name}/dropsources`
 * - Applies `?include=item` when `include_item=true`
 * - Forwards the `language` argument as a header override if provided
 * - Returns `payload.dropsources` when present; otherwise returns the raw API response
 *
 * @param {GetDropSourcesArgs} args - The tool arguments. See `def.input_schema` for the authoritative schema.
 * @returns {Promise<any>} An array of drop source objects from the API, or the full payload if not present.
 *
 * @throws {Error} If `url_name` is missing or not a string.
 * @throws {Error} If the upstream API responds with a non-2xx status (propagated by `wfmFetch`).
 *
 * @example
 * // Programmatic usage via MCP:
 * const result = await handler({ url_name: "loki_prime_set", include_item: true, language: "en" });
 * console.log(result);
 */
export const handler: ToolHandler = async (args: any) => {
  const { url_name, language, include_item = false } = (args ?? {}) as GetDropSourcesArgs;

  if (!url_name || typeof url_name !== "string") {
    throw new Error("'url_name' (string) is required");
  }

  const data = await wfmFetch(`/items/${encodeURIComponent(url_name)}/dropsources`, {
    language,
    query: include_item ? { include: "item" } : undefined
  });

  // Prefer the normalized list if available; otherwise return the raw response for transparency.
  return data?.payload?.dropsources ?? data;
};
