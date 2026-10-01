export const DEFAULT_HTTP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos (300.000 ms)
export const DEFAULT_HTTP_CACHE_MAX_ENTRIES = 150;

export interface HttpMemoryCacheEntry<T = unknown> {
  value: T;
  cachedAt: number;
  expiresAt: number;
}

export interface HttpMemoryCacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  expirations: number;
  size: number;
  maxEntries: number;
}

export interface LegislativeHttpMemoryCache {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T, ttlMs?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  prune?(): number;
  getStats?(): HttpMemoryCacheStats;
  readonly size?: number;
}

export type HttpCacheOption = LegislativeHttpMemoryCache | boolean | null | undefined;

export interface HttpMemoryCacheOptions {
  defaultTtlMs?: number;
  maxEntries?: number;
  clone?: boolean;
  now?: () => number;
}

export function cloneCachedValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (typeof Response !== 'undefined' && value instanceof Response) {
    return value.clone() as unknown as T;
  }

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fallback em caso de falha de serialização estruturada
    }
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export function buildHttpCacheKey(url: string | URL, method = 'GET'): string {
  const normalizedMethod = method.trim().toUpperCase();
  const urlObj = typeof url === 'string' ? new URL(url) : new URL(url.toString());
  urlObj.searchParams.sort();

  return `${normalizedMethod}:${urlObj.toString()}`;
}

export function isHttpMemoryCache(value: unknown): value is LegislativeHttpMemoryCache {
  return (
    typeof value === 'object' &&
    value !== null &&
    'get' in value &&
    typeof (value as LegislativeHttpMemoryCache).get === 'function' &&
    'set' in value &&
    typeof (value as LegislativeHttpMemoryCache).set === 'function' &&
    'has' in value &&
    typeof (value as LegislativeHttpMemoryCache).has === 'function' &&
    'clear' in value &&
    typeof (value as LegislativeHttpMemoryCache).clear === 'function'
  );
}

export function resolveHttpMemoryCache(
  cacheOption?: HttpCacheOption,
  options?: HttpMemoryCacheOptions
): LegislativeHttpMemoryCache | null {
  if (cacheOption === false || cacheOption === null) {
    return null;
  }

  if (isHttpMemoryCache(cacheOption)) {
    return cacheOption;
  }

  if (cacheOption === true) {
    return new HttpMemoryCache(options);
  }

  return null;
}

export class HttpMemoryCache implements LegislativeHttpMemoryCache {
  private readonly entries = new Map<string, HttpMemoryCacheEntry>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private readonly shouldClone: boolean;
  private readonly now: () => number;

  private hits = 0;
  private misses = 0;
  private sets = 0;
  private evictions = 0;
  private expirations = 0;

  constructor(options: HttpMemoryCacheOptions = {}) {
    this.defaultTtlMs =
      Number.isFinite(options.defaultTtlMs) && (options.defaultTtlMs as number) > 0
        ? (options.defaultTtlMs as number)
        : DEFAULT_HTTP_CACHE_TTL_MS;

    this.maxEntries =
      Number.isFinite(options.maxEntries) && (options.maxEntries as number) > 0
        ? Math.floor(options.maxEntries as number)
        : DEFAULT_HTTP_CACHE_MAX_ENTRIES;

    this.shouldClone = options.clone ?? true;
    this.now = options.now ?? (() => Date.now());
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    const currentTimestamp = this.now();
    if (entry.expiresAt <= currentTimestamp) {
      this.entries.delete(key);
      this.expirations++;
      this.misses++;
      return undefined;
    }

    // Atualização LRU: reinsere a entrada no final do Map (posição mais recente)
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.hits++;

    return (this.shouldClone ? cloneCachedValue(entry.value) : entry.value) as T;
  }

  set<T = unknown>(key: string, value: T, ttlMs?: number): void {
    const effectiveTtl =
      Number.isFinite(ttlMs) && (ttlMs as number) > 0 ? (ttlMs as number) : this.defaultTtlMs;

    if (effectiveTtl <= 0) {
      return;
    }

    const currentTimestamp = this.now();
    const expiresAt = currentTimestamp + effectiveTtl;
    const storedValue = this.shouldClone ? cloneCachedValue(value) : value;

    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      // Despejo LRU: remove a chave mais antiga (primeiro elemento iterado do Map)
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
        this.evictions++;
      }
    }

    this.entries.set(key, {
      value: storedValue,
      cachedAt: currentTimestamp,
      expiresAt
    });
    this.sets++;
  }

  has(key: string): boolean {
    const entry = this.entries.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.expirations++;
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  prune(): number {
    const currentTimestamp = this.now();
    let prunedCount = 0;

    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= currentTimestamp) {
        this.entries.delete(key);
        this.expirations++;
        prunedCount++;
      }
    }

    return prunedCount;
  }

  get size(): number {
    return this.entries.size;
  }

  getStats(): HttpMemoryCacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      evictions: this.evictions,
      expirations: this.expirations,
      size: this.entries.size,
      maxEntries: this.maxEntries
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.evictions = 0;
    this.expirations = 0;
  }
}
