import { BASE_URL, DEFAULT_LANGUAGE, DEFAULT_PLATFORM, JWT } from "../config.js";


function qs(params: Record<string, any> = {}): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === "") continue;
        usp.set(k, String(v));
    }
    const s = usp.toString();
    return s ? `?${s}` : "";
}


export async function wfmFetch(pathname: string, opts: {
    method?: string;
    language?: string;
    platform?: string;
    query?: Record<string, any>;
    body?: any;
    auth?: string; // raw JWT (without "JWT ")
} = {}) {
    const {
        method = "GET",
        language = DEFAULT_LANGUAGE,
        platform = DEFAULT_PLATFORM,
        query,
        body,
        auth
    } = opts;


    const url = `${BASE_URL}${pathname}${qs(query)}`;
    const headers: Record<string, string> = {
        Accept: "application/json",
        Language: language,
        Platform: platform,
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const jwt = auth || JWT;
    if (jwt) headers["Authorization"] = `JWT ${jwt}`;


    const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });


    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`WFM ${method} ${url} -> ${res.status} ${res.statusText} ${text ? "- " + text : ""}`);
    }
    return res.json();
}