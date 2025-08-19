import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";


export const name = "wfm_search_items" as const;
export const def: ToolDef = {
    name,
    description: "Buscar items por nombre usando /items (filtro local). Devuelve id, url_name, item_name y thumb.",
    inputSchema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Texto a buscar (nombre o url_name)" },
            limit: { type: "integer", description: "Máximo de resultados (1-100)", minimum: 1, maximum: 100 },
            language: { type: "string", description: "Encabezado Language (por defecto en)" }
        },
        required: ["query"],
        additionalProperties: false
    }
};
export const handler: ToolHandler = async (args: any) => {
    const { query, limit = 10, language } = args ?? {};
    if (!query || typeof query !== "string") throw new Error("'query' (string) is required");
    const data = await wfmFetch("/items", { language });
    const items: any[] = data?.payload?.items ?? [];
    const q = query.toLowerCase();
    const filtered = items.filter((it) =>
        it?.item_name?.toLowerCase?.().includes(q) || it?.url_name?.toLowerCase?.().includes(q)
    ).slice(0, Math.max(1, Math.min(100, Number(limit) || 10)));
    return {
        query,
        count: filtered.length,
        items: filtered.map((it) => ({ id: it.id, url_name: it.url_name, item_name: it.item_name, thumb: it.thumb })),
    };
};