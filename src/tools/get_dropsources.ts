import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";


export const name = "wfm_get_dropsources" as const;
export const def: ToolDef = {
    name,
    description: "Obtener fuentes de drop para un item.",
    inputSchema: {
        type: "object",
        properties: { url_name: { type: "string" }, include_item: { type: "boolean" }, language: { type: "string" } },
        required: ["url_name"],
        additionalProperties: false
    }
};
export const handler: ToolHandler = async (args: any) => {
    const { url_name, language, include_item = false } = args ?? {};
    if (!url_name || typeof url_name !== "string") throw new Error("'url_name' (string) is required");
    const data = await wfmFetch(`/items/${encodeURIComponent(url_name)}/dropsources`, {
        language,
        query: include_item ? { include: "item" } : undefined,
    });
    return data?.payload?.dropsources ?? data;
};
