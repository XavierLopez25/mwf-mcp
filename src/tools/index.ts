/**
 * @file src/tools/index.ts
 *
 * @module tools/index
 * @description
 * Aggregates all individual MCP tool modules (each exporting `name`, `def`, and `handler`)
 * into:
 *
 *  - `toolDefs`: an array of tool definitions used to answer the MCP request
 *    **`tools/list`** (i.e., the server advertises its tools and input schemas).
 *
 *  - `handlerMap`: a name→handler map used to dispatch **`tools/call`** requests
 *    to the correct implementation.
 *
 * Each tool module is expected to export:
 *  - `name: string` — the public tool name (unique across the server),
 *  - `def: ToolDef` — the tool definition (must include `input_schema` in snake_case),
 *  - `handler: ToolHandler` — the async function that performs the tool's work.
 *
 * @remarks
 * - This index is the single source of truth for which tools get exposed by the server.
 * - If a tool is missing from `modules[]`, it will **not** be visible to clients.
 * - Make sure tool names are unique; the last duplicate will overwrite earlier ones in `handlerMap`.
 */

import type { ToolDef, ToolHandler } from "../types.js";

// Import each tool module. Each must export { name, def, handler }.
import * as search_items from "./search_items.js";
import * as get_item from "./get_item.js";
import * as get_orders from "./get_orders.js";
import * as get_dropsources from "./get_dropsources.js";
import * as riven_items from "./riven_items.js";
import * as riven_attributes from "./riven_attributes.js";
import * as search_riven_auctions from "./search_riven_auctions.js";
import * as price_snapshot from "./price_snapshot.js";
import * as best_flips from "./best_flips.js";

/**
 * Structural shape required for a tool module to be aggregated.
 */
interface ToolModule {
  /** Public tool name (unique). */
  name: string;
  /** Tool definition (advertised via `tools/list`). */
  def: ToolDef;
  /** Tool handler (executed via `tools/call`). */
  handler: ToolHandler;
}

/**
 * Ordered list of tool modules to expose.
 *
 * @remarks
 * - Order does not affect behavior, but keeping a stable order helps with
 *   deterministic `tools/list` outputs and debugging.
 * - Add/remove tools here to change the server’s public surface.
 */
const modules: readonly ToolModule[] = [
  search_items as unknown as ToolModule,
  get_item as unknown as ToolModule,
  get_orders as unknown as ToolModule,
  get_dropsources as unknown as ToolModule,
  riven_items as unknown as ToolModule,
  riven_attributes as unknown as ToolModule,
  search_riven_auctions as unknown as ToolModule,
  price_snapshot as unknown as ToolModule,
  best_flips as unknown as ToolModule,
] as const;

/**
 * Collection of tool definitions used to serve `tools/list`.
 *
 * @example
 * // Server side:
 * server.setRequestHandler({ method: "tools/list", schema: ListToolsRequestSchema }, () => ({
 *   tools: toolDefs
 * }));
 */
export const toolDefs: ToolDef[] = modules.map((m) => m.def);

/**
 * Name-to-handler dispatch map used to serve `tools/call`.
 *
 * @example
 * // Server side:
 * server.setRequestHandler({ method: "tools/call", schema: CallToolRequestSchema }, async (req) => {
 *   const { name, arguments: args } = req.params;
 *   const handler = handlerMap[name];
 *   if (!handler) throw new Error(`Unknown tool: ${name}`);
 *   const result = await handler(args);
 *   return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
 * });
 */
export const handlerMap: Record<string, ToolHandler> = Object.fromEntries(
  modules.map((m) => [m.name, m.handler])
);