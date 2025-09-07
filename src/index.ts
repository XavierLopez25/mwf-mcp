/**
 * @file src/index.ts
 *
 * @module entrypoint
 * @description
 * Process entrypoint for the Warframe.Market MCP server (STDIO transport).
 * Loads environment variables (via `dotenv/config`) and starts the MCP server
 * over STDIO using {@link runStdioServer}.
 *
 * @usage
 * ```bash
 * # Build first
 * npm run build
 *
 * # Start the MCP server (STDIO)
 * node dist/index.js
 * ```
 *
 * @example
 * # Quick JSON-RPC smoke tests:
 *
 * # List tools
 * echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js | jq .
 *
 * # Call price snapshot (ONLINE IN GAME only, depth=3)
 * echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{
 *   "name":"wfm_price_snapshot",
 *   "arguments":{"url_name":"loki_prime_set","platform":"pc","status":"ingame","depth":3}
 * }}' | node dist/index.js | jq .
 *
 * @notes
 * - This file does not define server wiring; it only delegates to `runStdioServer()`.
 * - On fatal startup errors, the process exits with code 1.
 */

import "dotenv/config";
import { runStdioServer } from "./server.js";

/**
 * Boot the MCP server and report fatal errors.
 * Any unhandled rejection during startup results in a non-zero exit code.
 */
runStdioServer().catch((err) => {
  // Print the error with context to stderr for easier diagnostics.
  console.error("Failed to start MCP server:", err);
  process.exit(1);
});
