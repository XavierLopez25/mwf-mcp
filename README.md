# warframe-market-mcp

A **Model Context Protocol (MCP)** server that exposes **Warframe.Market** as a set of LLM-friendly tools. It provides price snapshots, order summaries with filtering (e.g., **ONLINE IN GAME** sellers), drop sources, and riven search — all over **STDIO + JSON-RPC 2.0**.

* **Runtime:** Node.js ≥ 18.17 (TypeScript)
* **Transport:** STDIO (local); can also be invoked via `npx` from other projects
* **Protocol:** JSON-RPC 2.0 (MCP)
* **Entry:** `dist/index.js` (also exported as a `bin` for CLI usage)

---

## Features

* **Market intelligence:** best buy/sell, midpoints, spread %, order counts.
* **Status filtering:** consider only **ONLINE IN GAME** or online users for realistic execution.
* **Riven tools:** search by weapon/attributes/rank/polarity with sorting options.
* **Drops:** quick access to item drop sources to plan farming routes.
* **LLM-ready:** strict `input_schema` per tool, concise JSON outputs.

---

## Requirements

* Node.js **≥ 18.17**
* (Optional) A Warframe.Market **JWT** if you intend to call authenticated endpoints.

  * Store **only the raw token**, without the `JWT ` prefix (details below).

---

## Installation

Clone the repository, then:

```bash
npm i
npm run build
```

> You can replace `npm` with `pnpm` or `yarn` if you prefer.

---

## Configuration

This server uses environment variables and provides sensible defaults:

| Variable       | Purpose                      | Default                          |
| -------------- | ---------------------------- | -------------------------------- |
| `WFM_BASE_URL` | Warframe.Market API base     | `https://api.warframe.market/v1` |
| `WFM_LANGUAGE` | Sent as `Language` header    | `en`                             |
| `WFM_PLATFORM` | Sent as `Platform` header    | `pc`                             |
| `WFM_JWT`      | (Optional) **raw** JWT token | *(unset)*                        |

**Important:** `WFM_JWT` must be **just the token**, *without* the `JWT ` prefix.
The server will add `Authorization: JWT <token>` automatically.

Example `.env`:

```bash
WFM_LANGUAGE=es
WFM_PLATFORM=pc
WFM_JWT=eyJhbGciOi...          # <- no "JWT " prefix here
```

Headers sent to the API:

```
Accept: application/json
Language: <WFM_LANGUAGE>
Platform: <WFM_PLATFORM>
Authorization: JWT <WFM_JWT>     # only if WFM_JWT is set
Content-Type: application/json   # for requests with body
```

---

## Run locally (STDIO)

```bash
node dist/index.js
```

Keep that terminal open; your MCP client will connect over STDIO.

**Quick JSON-RPC check (one-shot pipe):**

```bash
# tools/list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# tools/call: price snapshot
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{
  "name":"wfm_price_snapshot",
  "arguments":{"url_name":"loki_prime_set","platform":"pc","status":"ingame","depth":3}
}}' | node dist/index.js
```

> Add `| jq .` to pretty-print if you have `jq`.

---

## Use from another project (recommended)

### A) Via absolute path (repo clone, no publish)

Build this repo and then in your host project:

```bash
MCP_WARFRAME_COMMAND=node
MCP_WARFRAME_ARGS=/ABSOLUTE/PATH/to/warframe-market-mcp/dist/index.js
WFM_LANGUAGE=es
WFM_PLATFORM=pc
WFM_JWT=eyJhbGciOi...
```

### B) Via global link

```bash
npm run build
npm link  # or: pnpm link --global
```

Host project:

```bash
MCP_WARFRAME_COMMAND=mcp-warframe-market
MCP_WARFRAME_ARGS=
WFM_LANGUAGE=es
WFM_PLATFORM=pc
WFM_JWT=eyJhbGciOi...
```

---

## Using with Claude Desktop (example)

Edit Claude Desktop config (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "warframe": {
      "command": "npx",
      "args": ["-y", "mcp-warframe-market@latest"],
      "env": {
        "WFM_LANGUAGE": "es",
        "WFM_PLATFORM": "pc",
        "WFM_JWT": "eyJhbGciOi..."   // raw token
      }
    }
  }
}
```

Restart Claude; the tools should appear automatically.

---

## How do I get the JWT?
You create a [Warframe Market](https://warframe.market/) account and extract the JWT generated from `Inspect` > `Application` > `Cookies` > `JWT`.

---

## Tools (API)

Each tool is advertised via `tools/list` with an `input_schema` (JSON Schema).
Call a tool via `tools/call` with `{"name": "...","arguments": {...}}`.

### 1) `wfm_search_items`

Search items by name (local filter on `/items`).

**Arguments**

* `query` *(string, required)* – item name or `url_name`
* `limit` *(integer, 1–100, default 10)*
* `language` *(string, optional)*

**Returns**: `{ query, count, items: [{ id, url_name, item_name, thumb }] }`

---

### 2) `wfm_get_item`

Get item details by `url_name`.

**Arguments**

* `url_name` *(string, required)*
* `language` *(string, optional)*

**Returns**: payload `item` (name, set contents, MR, rarity, taxes, etc.)

---

### 3) `wfm_get_orders`

Buy/sell orders for an item (optionally summarized).
Includes **filters** for realistic execution.

**Arguments**

* `url_name` *(string, required)*
* `platform` *(pc|xbox|ps4|switch, optional)* — overrides default header
* `include_item` *(boolean, optional)*
* `summarize` *(boolean, default true)*
* `language` *(string, optional)*

**Advanced filters (recommended):**

* `status` *(any|online|ingame)* — use `ingame` to require **ONLINE IN GAME** users
* `min_reputation` *(integer)* — minimum user reputation
* `region` *(string)* — e.g. `en`, `ru`
* `depth` *(integer 1–10, default 5)* — how many top quotes to compute midpoints

**Returns (summarized)**:

```json
{
  "best_sell": { "platinum": 69, "user": "TraderX", "status": "ingame", "reputation": 15, ... },
  "best_buy":  { "platinum": 80, "user": "BuyerY",  "status": "online", "reputation": 10, ... },
  "midpoints": { "sell": 70, "buy": 78 },
  "spread":    { "absolute": 8, "pct": 0.114 },
  "totals":    { "sells": 510, "buys": 119 },
  "filters":   { "status": "ingame", "min_reputation": 10, "region": "en", "depth": 3 }
}
```

> If `summarize=false`, returns the raw `orders`.

---

### 4) `wfm_get_dropsources`

Drop sources for an item.

**Arguments**

* `url_name` *(string, required)*
* `include_item` *(boolean, optional)*
* `language` *(string, optional)*

**Returns**: `dropsources[]` (as provided by the API).

---

### 5) `wfm_riven_items`

List items supported by riven (used for `weapon_url_name`).

**Arguments:** none

**Returns:** `items[]`

---

### 6) `wfm_riven_attributes`

List riven attributes (positive/negative stat slugs).

**Arguments:** none

**Returns:** `attributes[]`

---

### 7) `wfm_search_riven_auctions`

Search riven auctions with common filters.

**Arguments (subset of API filters)**

* `platform` *(pc|xbox|ps4|switch)*
* `weapon_url_name` *(string)*
* `positive_stats` *(string\[])*, `negative_stats` *(string\[])* (use `["None"]` for none)
* `min_rank`, `max_rank` *(integer)*
* `re_rolls_min`, `re_rolls_max` *(integer)*
* `mastery_rank_min`, `mastery_rank_max` *(integer)*
* `polarity` *(madurai|vazarin|naramon|zenurik|any)*
* `sort_by` *(price\_desc|price\_asc|positive\_attr\_desc|positive\_attr\_asc)*
* `buyout_policy` *(direct|auction\_only|both)*

**Returns:** `{ count, auctions }`

---

### 8) `wfm_price_snapshot`

Convenience wrapper around `wfm_get_orders` to get best prices quickly.

**Arguments**

* `url_name` *(string, required)*
* `platform` *(pc|xbox|ps4|switch, optional)*
* `language` *(string, optional)*

**Optional filters** (forwarded to orders summary):

* `status`, `min_reputation`, `region`, `depth`

**Returns:** `{ url_name, platform, summary: <same as wfm_get_orders summarized> }`

---

### 9) `wfm_best_flips` *(optional, if included)*

Analyze multiple items and surface opportunities by **spread%** and liquidity.

**Arguments**

* `url_names` *(string\[], optional)* — explicit list of slugs
* `query` *(string, optional)* — search items (client-side) if `url_names` not provided
* `limit_search` *(1–50, default 10)* — how many items to consider from search
* `platform`, `language`
* `status` *(default `ingame`)*, `min_reputation`, `region`, `depth` *(default 3)*
* `min_spread_pct` *(number, default 0)* — minimum spread% threshold (0.1 = 10%)

**Returns (sorted by spread%)**:

```json
{
  "count": 5,
  "results": [
    {
      "url_name": "loki_prime_set",
      "mid_sell": 70,
      "mid_buy": 82,
      "spread_abs": 12,
      "spread_pct": 0.171,
      "totals": { "sells": 510, "buys": 119 },
      "best_sell": { ... },
      "best_buy": { ... }
    }
  ]
}
```

---

## Project structure

```
src/
  config.ts           # env defaults
  utils/http.ts       # fetch wrapper (headers, base URL)
  types.ts            # lightweight JSON schema & tool typings
  tools/
    search_items.ts
    get_item.ts
    get_orders.ts
    get_dropsources.ts
    riven_items.ts
    riven_attributes.ts
    search_riven_auctions.ts
    price_snapshot.ts
    best_flips.ts     # optional
    index.ts          # aggregates toolDefs & handlerMap
  server.ts           # MCP server wiring (tools/list, tools/call)
  index.ts            # entrypoint (shebang)
```

---

## Security & Auth Notes

* **JWT handling:** set `WFM_JWT` to the **raw** token only. The server adds `Authorization: JWT <token>`.
  If you paste `JWT eyJ...` into `WFM_JWT`, the header becomes `JWT JWT eyJ...` and requests will fail.
* For public tools (`/items`, etc.) you can omit `WFM_JWT`.

---

## Troubleshooting

* **401/403:** Confirm `WFM_JWT` is raw (no `JWT ` prefix).
* **No tools listed:** Ensure your MCP client actually launches this server (check `command`, `args`, and `env`).
* **Weird price outliers:** Increase `min_reputation` or enforce `status=ingame`, and try `depth` 3–5 to stabilize midpoints.
* **429/5xx:** Add simple retry/backoff in `wfmFetch` if your usage is bursty.

---

## Example “smoke test” script

Create `scripts/smoke.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo '--- tools/list ---'
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
| node dist/index.js | jq .

echo '--- wfm_search_items ---'
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"wfm_search_items","arguments":{"query":"loki prime","limit":3}}}' \
| node dist/index.js | jq .

echo '--- wfm_get_orders (ingame) ---'
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"wfm_get_orders","arguments":{"url_name":"loki_prime_set","platform":"pc","status":"ingame","depth":3}}}' \
| node dist/index.js | jq .
```

```bash
chmod +x scripts/smoke.sh
./scripts/smoke.sh
```

---

## Versioning

* Server name: `mcp-warframe-market`
* Version: `0.1.0`

---

## License

Add your chosen license (e.g., MIT) in `LICENSE`.
