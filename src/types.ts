/**
 * @file src/types.ts
 *
 * @module types
 * @description
 * Minimal shared TypeScript types for tools in this MCP server.
 * These types are intentionally lightweight and avoid coupling to specific
 * SDK versions beyond what is necessary, while preserving the MCP contract.
 *
 * @remarks
 * - MCP clients expect tool definitions returned by `tools/list` to include
 *   an **`input_schema`** field (snake_case), describing the tool’s arguments
 *   using JSON Schema.
 * - The `JSONSchema` type here is intentionally permissive to accommodate
 *   a variety of schema features without pulling a full JSON Schema library.
 */

/**
 * Minimal JSON Schema representation for tool arguments.
 */
export interface JSONSchema {
  /** The top-level schema type (e.g., "object"). */
  type: string;
  /** Object properties (when `type: "object"`). */
  properties?: Record<string, any>;
  /** Required property names (when `type: "object"`). */
  required?: string[];
  /** Whether additional properties are allowed (when `type: "object"`). */
  additionalProperties?: boolean;
  /** Enumerated values for primitive types or strings. */
  enum?: any[];
  /** Items schema for arrays. */
  items?: any;
  /** Optional human-readable description. */
  description?: string;
}

/**
 * Tool definition as advertised to MCP clients via `tools/list`.
 *
 * @property {string} name - Public, unique tool name.
 * @property {string} description - Purpose and behavior of the tool.
 * @property {JSONSchema} input_schema - Tool argument schema (snake_case, as required by MCP).
 */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: JSONSchema; // NOTE: snake_case is required by MCP
}

/**
 * Tool handler signature. Handlers receive an arbitrary `args` object (validated by the client
 * according to `input_schema`) and return an arbitrary JSON-serializable result.
 *
 * @param {any} args - Arguments provided by the MCP client (should satisfy `input_schema`).
 * @returns {Promise<any>} JSON-serializable result to be wrapped into MCP content by the server.
 */
export type ToolHandler = (args: any) => Promise<any>;
