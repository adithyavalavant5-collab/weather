// ============================================================================
// In-memory TTL cache for weather API responses.
// Prevents duplicate requests for the same location within the TTL window.
// Additive — does NOT touch existing code.
// ============================================================================

interface CacheEntry<T> {
  value: T;
  cachedAt: number;       // epoch ms when stored
  expiresAt: number;      // epoch ms when TTL expires
  isStale?: boolean;      // marks entries we chose to keep despite upstream error
}

export class WeatherCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 180_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /** Get a value only if it is still fresh (not expired). */
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      // Expired — drop from cache
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /** Get the most recent value regardless of freshness, including stale entries. */
  getStale(key: string): { value: T; cachedAt: number; isStale: boolean } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    return {
      value: entry.value,
      cachedAt: entry.cachedAt,
      isStale: Date.now() > entry.expiresAt,
    };
  }

  set(key: string, value: T, ttlMs?: number, isStale = false): void {
    const now = Date.now();
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, {
      value,
      cachedAt: now,
      expiresAt: now + ttl,
      isStale,
    });
  }

  /** Mark an entry as stale-but-keepable (used during upstream failure). */
  markStale(key: string): void {
    const entry = this.store.get(key);
    if (entry) entry.isStale = true;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
