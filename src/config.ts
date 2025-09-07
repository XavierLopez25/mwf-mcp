/**
 * @file src/config.ts
 *
 * @module config
 * @description
 * Centralized configuration for the Warframe.Market MCP server. Reads environment
 * variables (optionally via `dotenv`) and exposes typed, documented constants used
 * across HTTP utilities and tools.
 *
 * @env WFM_BASE_URL
 *  - Warframe.Market API base URL.
 *  - Default: "https://api.warframe.market/v1"
 *
 * @env WFM_LANGUAGE
 *  - Language header forwarded to the API (e.g., "en", "es").
 *  - Default: "en"
 *
 * @env WFM_PLATFORM
 *  - Platform header forwarded to the API (one of "pc", "xbox", "ps4", "switch").
 *  - Default: "pc"
 *
 * @env WFM_JWT
 *  - (Optional) Raw JWT token for authenticated endpoints. **Do not** include the
 *    "JWT " prefix; this project prepends "Authorization: JWT <token>" automatically.
 *  - Default: undefined
 *
 * @example
 * // .env
 * WFM_LANGUAGE=es
 * WFM_PLATFORM=pc
 * WFM_JWT=eyJhbGciOi...   # raw token (no "JWT " prefix)
 *
 * @example
 * // Usage in code:
 * import { BASE_URL, DEFAULT_LANGUAGE, DEFAULT_PLATFORM, JWT } from "../config.js";
 * console.log(BASE_URL, DEFAULT_LANGUAGE, DEFAULT_PLATFORM, !!JWT);
 */

/**
 * Warframe.Market API base URL.
 * @constant
 */
export const BASE_URL = process.env.WFM_BASE_URL || "https://api.warframe.market/v1";

/**
 * Default Language header (forwarded to Warframe.Market).
 * Common values include "en", "es", "ru".
 * @constant
 */
export const DEFAULT_LANGUAGE = process.env.WFM_LANGUAGE || "en";

/**
 * Default Platform header (forwarded to Warframe.Market).
 * Expected values: "pc", "xbox", "ps4", "switch".
 * @constant
 */
export const DEFAULT_PLATFORM = process.env.WFM_PLATFORM || "pc";

/**
 * Optional raw JWT token (without the "JWT " prefix).
 * When set, HTTP requests will include `Authorization: JWT <token>`.
 * @constant
 */
export const JWT = process.env.WFM_JWT;
