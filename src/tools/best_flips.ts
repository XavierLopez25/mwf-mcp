import type { ToolDef, ToolHandler } from "../types.js";
import { wfmFetch } from "../utils/http.js";
import { getOrdersSummary } from "./get_orders.js";

export const name = "wfm_best_flips" as const;
export const def: ToolDef = {
    name,
    description: "Analiza ítems y estima oportunidades (spread y liquidez) filtrando por status 'ingame/online', reputación y región.",
    inputSchema: {
        type: "object",
        properties: {
            url_names: { type: "array", items: { type: "string" }, description: "Lista de slugs a analizar" },
            query: { type: "string", description: "Texto para buscar ítems si no se pasan url_names" },
            limit_search: { type: "integer", minimum: 1, maximum: 50, description: "Cuántos ítems tomar de la búsqueda" },
            platform: { type: "string", enum: ["pc", "xbox", "ps4", "switch"] },
            language: { type: "string" },
            status: { type: "string", enum: ["any", "online", "ingame"], description: "Filtrar por estado de usuarios" },
            min_reputation: { type: "integer" },
            region: { type: "string" },
            depth: { type: "integer", minimum: 1, maximum: 10, description: "Profundidad para medianas" },
            min_spread_pct: { type: "number", description: "Umbral mínimo de spread % (0.1 = 10%)" }
        },
        required: [],
        additionalProperties: false
    }
};

export const handler: ToolHandler = async (args: any) => {
    const {
        url_names, query, limit_search = 10, platform, language,
        status = "ingame", min_reputation, region, depth = 3, min_spread_pct = 0
    } = args ?? {};

    let targets: string[] = Array.isArray(url_names) && url_names.length ? url_names : [];
    if (!targets.length && query) {
        const data = await wfmFetch("/items", { language });
        const items: any[] = data?.payload?.items ?? [];
        const q = String(query).toLowerCase();
        targets = items
            .filter(it => it?.item_name?.toLowerCase?.().includes(q) || it?.url_name?.toLowerCase?.().includes(q))
            .slice(0, Math.max(1, Math.min(50, Number(limit_search) || 10)))
            .map(it => it.url_name);
    }
    if (!targets.length) throw new Error("Provide either 'url_names' or 'query'");

    const results: any[] = [];
    for (const slug of targets) {
        try {
            const summary = await getOrdersSummary({ url_name: slug, platform, language, status, min_reputation, region, depth, summarize: true });
            const sell = summary.midpoints?.sell ?? null;
            const buy = summary.midpoints?.buy ?? null;
            const spreadAbs = (buy ?? 0) - (sell ?? 0);
            const spreadPct = sell ? spreadAbs / sell : null;

            if (spreadPct !== null && spreadPct >= min_spread_pct) {
                results.push({
                    url_name: slug,
                    mid_sell: sell,
                    mid_buy: buy,
                    spread_abs: spreadAbs,
                    spread_pct: spreadPct,
                    totals: summary.totals,
                    filters: summary.filters,
                    best_sell: summary.best_sell,
                    best_buy: summary.best_buy,
                });
            }
        } catch (e: any) {
            results.push({ url_name: slug, error: e?.message || String(e) });
        }
    }

    results.sort((a, b) => (b.spread_pct ?? -Infinity) - (a.spread_pct ?? -Infinity));
    return { count: results.length, results };
};
