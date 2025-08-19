import { wfmFetch } from "../utils/http.js";
import type { ToolDef, ToolHandler } from "../types.js";


export const name = "wfm_search_riven_auctions" as const;
export const def: ToolDef = {
    name,
    description: "Buscar subastas de rivens con filtros comunes (weapon_url_name, atributos, rangos, polaridad, ordenamiento).",
    inputSchema: {
        type: "object",
        properties: {
            platform: { type: "string", enum: ["pc", "xbox", "ps4", "switch"] },
            weapon_url_name: { type: "string", description: "Slug del arma (usa wfm_riven_items para opciones)" },
            positive_stats: { type: "array", items: { type: "string" }, description: "Atributos positivos (slugs)" },
            negative_stats: { type: "array", items: { type: "string" }, description: "Atributos negativos (slugs) o ['None']" },
            min_rank: { type: "integer" },
            max_rank: { type: "integer" },
            re_rolls_min: { type: "integer" },
            re_rolls_max: { type: "integer" },
            mastery_rank_min: { type: "integer" },
            mastery_rank_max: { type: "integer" },
            polarity: { type: "string", enum: ["madurai", "vazarin", "naramon", "zenurik", "any"] },
            sort_by: { type: "string", enum: ["price_desc", "price_asc", "positive_attr_desc", "positive_attr_asc"] },
            buyout_policy: { type: "string", enum: ["direct", "auction_only", "both"], description: "Filtra por buyout" }
        },
        required: [],
        additionalProperties: false
    }
};
export const handler: ToolHandler = async (args: any) => {
    const {
        platform,
        weapon_url_name,
        positive_stats,
        negative_stats,
        min_rank,
        max_rank,
        re_rolls_min,
        re_rolls_max,
        mastery_rank_min,
        mastery_rank_max,
        polarity,
        sort_by,
        buyout_policy,
    } = args ?? {};


    const query: Record<string, any> = {
        weapon_url_name,
        positive_stats: Array.isArray(positive_stats) ? positive_stats.join(",") : positive_stats,
        negative_stats: Array.isArray(negative_stats) ? negative_stats.join(",") : negative_stats,
        min_rank,
        max_rank,
        re_rolls_min,
        re_rolls_max,
        mastery_rank_min,
        mastery_rank_max,
        polarity,
        sort_by,
    };
    if (buyout_policy) query["buyout_policy"] = buyout_policy;


    const data = await wfmFetch("/auctions/search", { platform, query: { type: "riven", ...query } });
    const auctions: any[] = data?.payload?.auctions ?? [];
    return { count: auctions.length, auctions };
};