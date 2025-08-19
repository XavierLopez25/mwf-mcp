export const BASE_URL = process.env.WFM_BASE_URL || "https://api.warframe.market/v1";
export const DEFAULT_LANGUAGE = process.env.WFM_LANGUAGE || "en"; // header: Language
export const DEFAULT_PLATFORM = process.env.WFM_PLATFORM || "pc"; // header: Platform
export const JWT = process.env.WFM_JWT; // header: Authorization: JWT <token>