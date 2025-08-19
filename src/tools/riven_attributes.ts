import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";


export const name = "wfm_riven_attributes" as const;
export const def: ToolDef = {
    name,
    description: "Listar atributos de rivens (para positive/negative_stats).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
};
export const handler: ToolHandler = async () => {
    const data = await wfmFetch("/riven/attributes");
    return data?.payload?.attributes ?? data;
};