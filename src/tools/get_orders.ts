import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";
import { DEFAULT_PLATFORM } from "../config.js";


export const name = "wfm_get_orders" as const;
export const def: ToolDef = {
    name,
    description: "Obtener órdenes de compra/venta para un item y plataforma. Puede resumir mejores precios.",
    inputSchema: {
        type: "object",
        properties: {
            url_name: { type: "string" },
            platform: { type: "string", enum: ["pc", "xbox", "ps4", "switch"], description: "Header Platform" },
            include_item: { type: "boolean" },
            summarize: { type: "boolean", description: "Si true, devuelve mejor venta/compra y totales" },
            language: { type: "string" }
        },
        required: ["url_name"],
        additionalProperties: false
    }
};

export async function getOrdersSummary(args: any) {
    const { url_name, platform, include_item = false, summarize = true, language } = args ?? {};
    if (!url_name || typeof url_name !== "string") throw new Error("'url_name' (string) is required");
    const data = await wfmFetch(`/items/${encodeURIComponent(url_name)}/orders`, {
        platform,
        language,
        query: include_item ? { include: "item" } : undefined,
    });
    const orders: any[] = data?.payload?.orders ?? [];


    if (!summarize) return { orders };


    const visible = orders.filter((o) => o.visible !== false);
    const sells = visible.filter((o) => o.order_type === "sell").sort((a, b) => a.platinum - b.platinum);
    const buys = visible.filter((o) => o.order_type === "buy").sort((a, b) => b.platinum - a.platinum);


    const topSell = sells[0] ?? null;
    const topBuy = buys[0] ?? null;


    return {
        best_sell: topSell ? {
            platinum: topSell.platinum,
            quantity: topSell.quantity,
            user: topSell.user?.ingame_name ?? topSell.user?.name ?? null,
            region: topSell.region ?? null,
            last_update: topSell.last_update,
            platform: topSell.platform,
            subtype: topSell.subtype ?? null,
        } : null,
        best_buy: topBuy ? {
            platinum: topBuy.platinum,
            quantity: topBuy.quantity,
            user: topBuy.user?.ingame_name ?? topBuy.user?.name ?? null,
            region: topBuy.region ?? null,
            last_update: topBuy.last_update,
            platform: topBuy.platform,
            subtype: topBuy.subtype ?? null,
        } : null,
        totals: { sells: sells.length, buys: buys.length },
    };
}
export const handler: ToolHandler = getOrdersSummary;