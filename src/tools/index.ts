import type { ToolDef, ToolHandler } from "../types.js";


import * as search_items from "./search_items.js";
import * as get_item from "./get_item.js";
import * as get_orders from "./get_orders.js";
import * as get_dropsources from "./get_dropsources.js";
import * as riven_items from "./riven_items.js";
import * as riven_attributes from "./riven_attributes.js";
import * as search_riven_auctions from "./search_riven_auctions.js";
import * as price_snapshot from "./price_snapshot.js";
import * as best_flips from './best_flips.js';


const modules = [
    search_items,
    get_item,
    get_orders,
    get_dropsources,
    riven_items,
    riven_attributes,
    search_riven_auctions,
    price_snapshot,
    best_flips,
] as const;


export const toolDefs: ToolDef[] = modules.map((m) => m.def);
export const handlerMap: Record<string, ToolHandler> = Object.fromEntries(
    modules.map((m: any) => [m.name, m.handler])
);