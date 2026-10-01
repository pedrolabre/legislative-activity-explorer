import { describe, expect, it } from 'vitest';
import {
  buildHttpCacheKey,
  cloneCachedValue,
  DEFAULT_HTTP_CACHE_MAX_ENTRIES,
  DEFAULT_HTTP_CACHE_TTL_MS,
  HttpMemoryCache,
  isHttpMemoryCache,
  resolveHttpMemoryCache
} from './httpMemoryCache';

describe('HttpMemoryCache', () => {
  it('stores and retrieves cached data by key', () => {
    const cache = new HttpMemoryCache();

    cache.set('deputy:123', { id: 123, nome: 'Maria' });

    expect(cache.has('deputy:123')).toBe(true);
    expect(cache.get('deputy:123')).toEqual({ id: 123, nome: 'Maria' });
    expect(cache.size).toBe(1);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(0);
    expect(stats.sets).toBe(1);
  });

  it('records cache misses for nonexistent entries', () => {
    const cache = new HttpMemoryCache();

    expect(cache.has('deputy:999')).toBe(false);
    expect(cache.get('deputy:999')).toBeUndefined();

    const stats = cache.getStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
  });

  it('expires entries based on TTL and virtual clock advancement', () => {
    let now = 1000;
    const cache = new HttpMemoryCache({
      defaultTtlMs: 500,
      now: () => now
    });

    cache.set('key-a', { active: true });
    cache.set('key-b', { active: true }, 200);

    expect(cache.get('key-a')).toEqual({ active: true });
    expect(cache.get('key-b')).toEqual({ active: true });

    // Avança o relógio além de key-b (200ms), mas antes de key-a (500ms)
    now += 300;
    expect(cache.has('key-b')).toBe(false);
    expect(cache.get('key-b')).toBeUndefined();
    expect(cache.get('key-a')).toEqual({ active: true });

    // Avança além do TTL de key-a
    now += 300;
    expect(cache.has('key-a')).toBe(false);
    expect(cache.get('key-a')).toBeUndefined();

    const stats = cache.getStats();
    expect(stats.expirations).toBe(2);
    expect(stats.size).toBe(0);
  });

  it('evicts the least recently used (LRU) entry when maxEntries is exceeded', () => {
    const cache = new HttpMemoryCache({
      maxEntries: 3
    });

    cache.set('item-1', 1);
    cache.set('item-2', 2);
    cache.set('item-3', 3);

    // item-1 é o mais antigo; item-3 o mais recente
    expect(cache.size).toBe(3);

    // Inserção de um 4º item deve expulsar item-1
    cache.set('item-4', 4);

    expect(cache.has('item-1')).toBe(false);
    expect(cache.get('item-1')).toBeUndefined();
    expect(cache.get('item-2')).toBe(2);
    expect(cache.get('item-3')).toBe(3);
    expect(cache.get('item-4')).toBe(4);

    const stats = cache.getStats();
    expect(stats.evictions).toBe(1);
  });

  it('updates LRU recency position when reading an item with get()', () => {
    const cache = new HttpMemoryCache({
      maxEntries: 3
    });

    cache.set('item-1', 1);
    cache.set('item-2', 2);
    cache.set('item-3', 3);

    // Acessa item-1; agora a ordem de descarte deve ser item-2, item-3, item-1
    expect(cache.get('item-1')).toBe(1);

    // Inserção de item-4 deve expulsar item-2 (pois item-1 foi promovido para mais recente)
    cache.set('item-4', 4);

    expect(cache.has('item-2')).toBe(false);
    expect(cache.get('item-1')).toBe(1);
    expect(cache.get('item-3')).toBe(3);
    expect(cache.get('item-4')).toBe(4);
  });

  it('updates existing keys without incrementing evictions or breaking LRU order', () => {
    const cache = new HttpMemoryCache({
      maxEntries: 2
    });

    cache.set('item-1', 'initial');
    cache.set('item-2', 'second');
    cache.set('item-1', 'updated');

    expect(cache.size).toBe(2);
    expect(cache.get('item-1')).toBe('updated');

    // item-1 foi atualizado, então item-2 é o mais antigo agora
    cache.set('item-3', 'third');
    expect(cache.has('item-2')).toBe(false);
    expect(cache.get('item-1')).toBe('updated');
    expect(cache.get('item-3')).toBe('third');

    expect(cache.getStats().evictions).toBe(1);
  });

  it('supports deletion, clearing and active pruning', () => {
    let now = 1000;
    const cache = new HttpMemoryCache({
      now: () => now
    });

    cache.set('item-1', 1, 100);
    cache.set('item-2', 2, 500);
    cache.set('item-3', 3, 1000);

    expect(cache.delete('item-3')).toBe(true);
    expect(cache.delete('nonexistent')).toBe(false);
    expect(cache.size).toBe(2);

    now += 200; // item-1 expirou (100ms), item-2 continua válido (500ms)
    const pruned = cache.prune();
    expect(pruned).toBe(1);
    expect(cache.has('item-1')).toBe(false);
    expect(cache.has('item-2')).toBe(true);
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.has('item-2')).toBe(false);
  });

  it('clones objects to guarantee caller mutation isolation', () => {
    const cache = new HttpMemoryCache();
    const originalPayload = {
      deputado: {
        id: 100,
        tags: ['saude', 'educacao']
      }
    };

    cache.set('payload', originalPayload);

    // Muta o objeto original externo após o set
    originalPayload.deputado.tags.push('seguranca');

    const retrieved1 = cache.get<{ deputado: { id: number; tags: string[] } }>('payload');
    expect(retrieved1?.deputado.tags).toEqual(['saude', 'educacao']);

    // Muta o objeto retornado do get
    retrieved1?.deputado.tags.push('economia');

    const retrieved2 = cache.get<{ deputado: { id: number; tags: string[] } }>('payload');
    expect(retrieved2?.deputado.tags).toEqual(['saude', 'educacao']);
  });

  it('resets diagnostic statistics on demand', () => {
    const cache = new HttpMemoryCache();

    cache.set('k', 1);
    cache.get('k');
    cache.get('missing');

    expect(cache.getStats().hits).toBe(1);
    expect(cache.getStats().misses).toBe(1);

    cache.resetStats();

    const cleanStats = cache.getStats();
    expect(cleanStats.hits).toBe(0);
    expect(cleanStats.misses).toBe(0);
    expect(cleanStats.sets).toBe(0);
    expect(cleanStats.evictions).toBe(0);
    expect(cleanStats.expirations).toBe(0);
    expect(cleanStats.size).toBe(1);
  });

  it('uses default configurations for TTL and max entries when unspecified', () => {
    const cache = new HttpMemoryCache();
    const stats = cache.getStats();

    expect(stats.maxEntries).toBe(DEFAULT_HTTP_CACHE_MAX_ENTRIES);
    expect(DEFAULT_HTTP_CACHE_TTL_MS).toBe(300000);
  });
});

describe('buildHttpCacheKey', () => {
  it('normalizes method and sorts search parameters alphabetically', () => {
    const key1 = buildHttpCacheKey(
      'https://dadosabertos.camara.leg.br/api/v2/proposicoes?ordem=ASC&pagina=2&itens=15',
      'get'
    );
    const key2 = buildHttpCacheKey(
      'https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=15&ordem=ASC&pagina=2',
      'GET'
    );

    expect(key1).toBe(key2);
    expect(key1).toBe(
      'GET:https://dadosabertos.camara.leg.br/api/v2/proposicoes?itens=15&ordem=ASC&pagina=2'
    );
  });

  it('handles URL instances and paths without query parameters', () => {
    const url = new URL('https://legis.senado.leg.br/dadosabertos/senador/123.json');
    const key = buildHttpCacheKey(url);

    expect(key).toBe('GET:https://legis.senado.leg.br/dadosabertos/senador/123.json');
  });
});

describe('cloneCachedValue', () => {
  it('returns primitives as-is', () => {
    expect(cloneCachedValue(null)).toBeNull();
    expect(cloneCachedValue(42)).toBe(42);
    expect(cloneCachedValue('hello')).toBe('hello');
    expect(cloneCachedValue(true)).toBe(true);
  });

  it('clones Response objects via Response.clone()', async () => {
    const original = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const cloned = cloneCachedValue(original);

    expect(cloned).not.toBe(original);
    expect(await cloned.json()).toEqual({ ok: true });
    expect(await original.json()).toEqual({ ok: true });
  });
});

describe('resolveHttpMemoryCache and isHttpMemoryCache', () => {
  it('resolves null when false or null is provided', () => {
    expect(resolveHttpMemoryCache(false)).toBeNull();
    expect(resolveHttpMemoryCache(null)).toBeNull();
    expect(resolveHttpMemoryCache(undefined)).toBeNull();
  });

  it('creates a new cache instance when true is provided', () => {
    const resolved = resolveHttpMemoryCache(true);
    expect(resolved).toBeInstanceOf(HttpMemoryCache);
  });

  it('returns the existing cache instance if valid', () => {
    const existing = new HttpMemoryCache();
    expect(resolveHttpMemoryCache(existing)).toBe(existing);
  });

  it('identifies valid cache implementations with isHttpMemoryCache', () => {
    const cache = new HttpMemoryCache();
    expect(isHttpMemoryCache(cache)).toBe(true);

    const duckTyped = {
      get: () => undefined,
      set: () => {},
      has: () => false,
      delete: () => false,
      clear: () => {}
    };
    expect(isHttpMemoryCache(duckTyped)).toBe(true);

    expect(isHttpMemoryCache(null)).toBe(false);
    expect(isHttpMemoryCache({})).toBe(false);
    expect(isHttpMemoryCache('string')).toBe(false);
  });
});
