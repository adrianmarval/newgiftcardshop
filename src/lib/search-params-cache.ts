// ─────────────────────────────────────────────────────────────────────────────
// Search Params Cache — nuqs v2 server-side parsing
// ─────────────────────────────────────────────────────────────────────────────

import { createSearchParamsCache } from "nuqs/server";
import { orderSearchParamsParsers } from "@/types/order/search-params";

export const searchParamsCache = createSearchParamsCache(orderSearchParamsParsers);
