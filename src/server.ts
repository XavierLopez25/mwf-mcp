/**
 * @file src/server.ts
 *
 * @module server
 * @description
 * STDIO-based MCP server bootstrap. Wires the MCP protocol handlers for
 * `tools/list` and `tools/call` using the official SDK request schemas,
 * exposes the tool catalog (`toolDefs`), and dispatches tool invocations
 * via `handlerMap`.
 *
 * Transport: {@link StdioServerTransport} (JSON-RPC 2.0 over stdio)
 *
 * @remarks
 * - This module does not define tools; it only exposes what is aggregated in
 *   {@link ../tools/index.js | tools/index}.
 * - Responses are returned as MCP contents with a single `text` part
 *   containing a pretty-printed JSON string of the tool result. If you
 *   plan to return non-text contents, adjust the return shape accordingly.
 *
 * @example
 * // Start the server (see src/index.ts)
 * node dist/index.js
 *
 * // List tools:
 * echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js | jq .
 *
 * // Call a tool:
 * echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{
 *   "name":"wfm_price_snapshot",
 *   "arguments":{"url_name":"loki_prime_set","platform":"pc","status":"ingame","depth":3}
 * }}' | node dist/index.js | jq .
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toolDefs, handlerMap } from "./tools/index.js";

/**
 * Bootstraps and connects the MCP server over STDIO.
 *
 * @returns {Promise<void>} Resolves once the server is connected to the STDIO transport.
 *
 * @throws {Error} Propagates errors thrown by the SDK during `connect`.
 */
export async function runStdioServer(): Promise<void> {
  // Initialize the MCP server with a name and version; advertise tools capability.
  const server = new Server(
    { name: "mcp-warframe-market", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  /**
   * Handle `tools/list`:
   * Return the full catalog of tool definitions, each containing `name`,
   * `description`, and `input_schema` (snake_case) as required by MCP.
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefs,
  }));

  /**
   * Handle `tools/call`:
   * Dispatch to the appropriate tool handler by name, forward `arguments`,
   * and wrap the result into a text content payload for MCP clients.
   */
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    if (!name || typeof name !== "string") {
      throw new Error("Invalid tool call: missing name");
    }

    const handler = handlerMap[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await handler(args);

    // Return a single-part text content with pretty JSON for readability.
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  // Connect to stdio transport (keeps the process alive handling requests).
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
