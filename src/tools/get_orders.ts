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
            language: { type: "string" },
            status: { type: "string", enum: ["ingame"], description: "Filtrar por estado del usuario" },
            min_reputation: { type: "integer", description: "Reputación mínima del usuario" },
            region: { type: "string", description: "Región (en, ru, etc.)" },
            depth: { type: "integer", description: "Profundidad para mediana (1-10)", minimum: 1, maximum: 10 }
        },
        required: ["url_name"],
        additionalProperties: false
    }
};

export async function getOrdersSummary(args: any) {
    const {
        url_name, platform, include_item = false, summarize = true, language,
        status = "any", min_reputation, region, depth = 5
    } = args ?? {};
    if (!url_name || typeof url_name !== "string") throw new Error("'url_name' (string) is required");

    const data = await wfmFetch(`/items/${encodeURIComponent(url_name)}/orders`, {
        platform, language, query: include_item ? { include: "item" } : undefined,
    });
    let orders: any[] = data?.payload?.orders ?? [];

    const statusOk = (u?: string) => {
        if (status === "any") return true;
        if (!u) return false;
        if (status === "ingame") return u === "ingame";
        if (status === "online") return u === "ingame" || u === "online";
        return true;
    };

    orders = orders.filter(o => o.visible !== false);
    orders = orders.filter(o => statusOk(o.user?.status));
    if (typeof min_reputation === "number") orders = orders.filter(o => (o.user?.reputation ?? -Infinity) >= min_reputation);
    if (region) orders = orders.filter(o => (o.region === region) || (o.user?.region === region));

    if (!summarize) return { orders };

    const sells = orders.filter(o => o.order_type === "sell").sort((a, b) => a.platinum - b.platinum);
    const buys = orders.filter(o => o.order_type === "buy").sort((a, b) => b.platinum - a.platinum);

    const topSell = sells[0] ?? null;
    const topBuy = buys[0] ?? null;

    const k = Math.max(1, Math.min(10, Number(depth) || 5));
    const mid = (arr: any[]) => {
        if (!arr.length) return null;
        const slice = arr.slice(0, Math.min(k, arr.length)).map(x => x.platinum).sort((a, b) => a - b);
        const m = Math.floor(slice.length / 2);
        return slice.length % 2 ? slice[m] : (slice[m - 1] + slice[m]) / 2;
    };

    const mid_sell = mid(sells);
    const mid_buy = mid(buys);
    const spread_abs = (mid_buy ?? 0) - (mid_sell ?? 0);
    const spread_pct = mid_sell ? spread_abs / mid_sell : null;

    return {
        best_sell: topSell ? {
            platinum: topSell.platinum, quantity: topSell.quantity,
            user: topSell.user?.ingame_name ?? topSell.user?.name ?? null,
            region: topSell.region ?? null, last_update: topSell.last_update,
            platform: topSell.platform, subtype: topSell.subtype ?? null,
            status: topSell.user?.status ?? null, reputation: topSell.user?.reputation ?? null,
        } : null,
        best_buy: topBuy ? {
            platinum: topBuy.platinum, quantity: topBuy.quantity,
            user: topBuy.user?.ingame_name ?? topBuy.user?.name ?? null,
            region: topBuy.region ?? null, last_update: topBuy.last_update,
            platform: topBuy.platform, subtype: topBuy.subtype ?? null,
            status: topBuy.user?.status ?? null, reputation: topBuy.user?.reputation ?? null,
        } : null,
        midpoints: { sell: mid_sell, buy: mid_buy },
        spread: { absolute: spread_abs, pct: spread_pct },
        totals: { sells: sells.length, buys: buys.length },
        filters: { status, min_reputation: min_reputation ?? null, region: region ?? null, depth: k },
    };
}

export const handler: ToolHandler = getOrdersSummary;