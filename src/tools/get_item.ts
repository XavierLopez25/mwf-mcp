import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";


export const name = "wfm_get_item" as const;
export const def: ToolDef = {
    name,
    description: "Obtener detalles de un item por url_name (items_in_set, rareza, MR, impuestos, etc).",
    inputSchema: {
        type: "object",
        properties: { url_name: { type: "string" }, language: { type: "string" } },
        required: ["url_name"],
        additionalProperties: false
    }
};
export const handler: ToolHandler = async (args: any) => {
    const { url_name, language } = args ?? {};
    if (!url_name || typeof url_name !== "string") throw new Error("'url_name' (string) is required");
    const data = await wfmFetch(`/items/${encodeURIComponent(url_name)}`, { language });
    return data?.payload?.item || data;
};