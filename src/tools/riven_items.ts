import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";


export const name = "wfm_riven_items" as const;
export const def: ToolDef = {
    name,
    description: "Listar ítems soportados por riven (para weapon_url_name).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
};
export const handler: ToolHandler = async () => {
    const data = await wfmFetch("/riven/items");
    return data?.payload?.items ?? data;
};