// Shared in-memory cache for the Deals page.
// Exported as live ESM bindings so any module that imports
// dealsCache / dealsCacheTimestamp always sees the latest value.
export let dealsCache = null;
export let dealsCacheTimestamp = 0;
export const DEALS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export function setDealsCache(data) {
  dealsCache = data;
  dealsCacheTimestamp = Date.now();
}

export function clearDealsCache() {
  dealsCache = null;
  dealsCacheTimestamp = 0;
}
