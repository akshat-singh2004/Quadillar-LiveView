import { Redis } from "@upstash/redis";

type CacheEntry = { value: unknown; expiresAt: number };

const memoryCache = new Map<string, CacheEntry>();
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

export async function getCachedData<T>(key: string): Promise<T | null> {
  if (redis) {
    try {
      return await redis.get<T>(key);
    } catch (error) {
      console.warn("Upstash cache read failed; using memory fallback:", error);
    }
  }

  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function setCachedData<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
      return;
    } catch (error) {
      console.warn("Upstash cache write failed; using memory fallback:", error);
    }
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlSeconds) * 1000 });
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
    } catch (error) {
      console.warn("Upstash cache invalidation failed; clearing matching memory entries:", error);
    }
  }

  const expression = new RegExp(`^${pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
  for (const key of memoryCache.keys()) {
    if (expression.test(key)) memoryCache.delete(key);
  }
}