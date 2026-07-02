interface CacheEntry<T> {
  value: T;
  expiry: number;
}

// Global cache object (survives inside Node.js hot-module replacement if we assign to global)
/* eslint-disable no-var */
declare global {
  var swerankCache: Record<string, CacheEntry<any>> | undefined;
}

const cache = globalThis.swerankCache || {};
if (process.env.NODE_ENV !== 'production') {
  globalThis.swerankCache = cache;
}

/**
 * Gets a value from the in-memory cache. Returns null if expired or missing.
 */
export function getCache<T>(key: string): T | null {
  const entry = cache[key];
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    delete cache[key];
    return null;
  }

  return entry.value as T;
}

/**
 * Sets a value in the in-memory cache with a given TTL (Time-To-Live) in milliseconds.
 * Default TTL is 5 minutes (300,000 ms).
 */
export function setCache<T>(key: string, value: T, ttlMs: number = 300000): void {
  cache[key] = {
    value,
    expiry: Date.now() + ttlMs
  };
}

/**
 * Clears the entire cache (useful for force refreshes)
 */
export function clearCache(): void {
  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}
