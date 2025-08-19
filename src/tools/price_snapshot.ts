import type { ToolDef, ToolHandler } from "../types.js";
import { DEFAULT_PLATFORM } from "../config.js";
import { getOrdersSummary } from "./get_orders.js";


export const name = "wfm_price_snapshot" as const;
export const def: ToolDef = {
    name,
    description: "Atajo: devuelve mejor venta y mejor compra para un item en una plataforma.",
    inputSchema: {
        type: "object",
        properties: {
            url_name: { type: "string" },
            platform: { type: "string", enum: ["pc", "xbox", "ps4", "switch"] },
            language: { type: "string" }
        },
        required: ["url_name"],
        additionalProperties: false
    }
};
export const handler: ToolHandler = async (args: any) => {
    const { url_name, platform, language } = args ?? {};
    if (!url_name) throw new Error("'url_name' is required");
    const summary = await getOrdersSummary({ url_name, platform, language, summarize: true });
    return { url_name, platform: platform || DEFAULT_PLATFORM, summary };
};