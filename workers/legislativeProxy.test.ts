import { describe, expect, it } from 'vitest';
import {
  buildLegislativeProxyCacheKey,
  handleLegislativeProxyRequest,
  LEGISLATIVE_PROXY_CACHE_TTL_SECONDS,
  type LegislativeProxyCache,
  type LegislativeProxyFetch
} from './legislativeProxy';

class MemoryCache implements LegislativeProxyCache {
  private readonly responses = new Map<string, Response>();

  async match(request: Request) {
    return this.responses.get(request.url)?.clone();
  }

  async put(request: Request, response: Response) {
    this.responses.set(request.url, response.clone());
  }
}

function createProxyRequest(targetUrl: string, init?: RequestInit) {
  const proxyUrl = new URL('https://proxy.example/legislative');
  proxyUrl.searchParams.set('url', targetUrl);

  return new Request(proxyUrl.toString(), init);
}

async function readJson(response: Response) {
  return (await response.json()) as unknown;
}

describe('handleLegislativeProxyRequest', () => {
  it('answers CORS preflight without touching the upstream fetcher', async () => {
    let fetchCalls = 0;
    const response = await handleLegislativeProxyRequest(
      new Request('https://proxy.example/legislative', {
        method: 'OPTIONS'
      }),
      {
        fetcher: async () => {
          fetchCalls += 1;
          return new Response('{}');
        }
      }
    );

    expect(response.status).toBe(204);
    expect(fetchCalls).toBe(0);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
  });

  it('rejects non-GET methods with a neutral error', async () => {
    const response = await handleLegislativeProxyRequest(
      createProxyRequest('https://dadosabertos.camara.leg.br/api/v2/deputados/1', {
        method: 'POST'
      })
    );

    expect(response.status).toBe(405);
    expect(await readJson(response)).toEqual({
      error: 'Metodo nao aceito para consulta oficial.'
    });
  });

  it('rejects empty target URLs', async () => {
    const response = await handleLegislativeProxyRequest(
      new Request('https://proxy.example/legislative?url=%20%20')
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: 'URL oficial nao informada para consulta.'
    });
  });

  it('rejects target URLs outside HTTP and HTTPS', async () => {
    const response = await handleLegislativeProxyRequest(
      createProxyRequest('ftp://dadosabertos.camara.leg.br/api/v2/deputados/1')
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: 'Protocolo nao aceito para consulta oficial.'
    });
  });

  it('rejects hosts outside the legislative allowlist', async () => {
    const response = await handleLegislativeProxyRequest(
      createProxyRequest('https://www.camara.leg.br/propostas-legislativas/1234')
    );

    expect(response.status).toBe(403);
    expect(await readJson(response)).toEqual({
      error: 'Destino oficial nao autorizado para consulta.'
    });
  });

  it('rejects hostnames that only prefix an allowed official host', async () => {
    const response = await handleLegislativeProxyRequest(
      createProxyRequest('https://dadosabertos.camara.leg.br.example.test/api/v2/deputados')
    );

    expect(response.status).toBe(403);
  });

  it('proxies allowed Camara requests using deterministic fetch injection', async () => {
    const calls: { input: string; init?: RequestInit }[] = [];
    const fetcher: LegislativeProxyFetch = async (input, init) => {
      calls.push({ input, init });

      return new Response(JSON.stringify({ dados: [{ id: 10 }] }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    };
    const response = await handleLegislativeProxyRequest(
      createProxyRequest('https://dadosabertos.camara.leg.br/api/v2/deputados?nome=ana'),
      {
        fetcher
      }
    );

    expect(calls).toEqual([
      {
        input: 'https://dadosabertos.camara.leg.br/api/v2/deputados?nome=ana',
        init: {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        }
      }
    ]);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Cache-Control')).toBe(
      `public, max-age=0, s-maxage=${LEGISLATIVE_PROXY_CACHE_TTL_SECONDS}`
    );
    expect(await readJson(response)).toEqual({ dados: [{ id: 10 }] });
  });

  it('proxies allowed Senado requests', async () => {
    const calls: string[] = [];
    const response = await handleLegislativeProxyRequest(
      createProxyRequest('https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json'),
      {
        fetcher: async (input) => {
          calls.push(input);

          return new Response(JSON.stringify({ ListaParlamentarEmExercicio: {} }), {
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      }
    );

    expect(calls).toEqual([
      'https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json'
    ]);
    expect(response.status).toBe(200);
    expect(await readJson(response)).toEqual({ ListaParlamentarEmExercicio: {} });
  });

  it('serves a cached response before calling upstream fetch', async () => {
    const targetUrl = new URL('https://dadosabertos.camara.leg.br/api/v2/deputados/10');
    const cache = new MemoryCache();

    await cache.put(
      buildLegislativeProxyCacheKey(targetUrl),
      new Response('cached body', {
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    );

    const response = await handleLegislativeProxyRequest(createProxyRequest(targetUrl.toString()), {
      cache,
      fetcher: async () => {
        throw new Error('fetch should not be called on cache hit');
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await response.text()).toBe('cached body');
  });

  it('stores successful upstream responses in temporary cache', async () => {
    const targetUrl = new URL('https://legis.senado.leg.br/dadosabertos/materia/300.json');
    const cache = new MemoryCache();

    await handleLegislativeProxyRequest(createProxyRequest(targetUrl.toString()), {
      cache,
      fetcher: async () =>
        new Response(JSON.stringify({ DetalheMateria: { Materia: {} } }), {
          headers: {
            'Content-Type': 'application/json'
          }
        })
    });

    const cachedResponse = await cache.match(buildLegislativeProxyCacheKey(targetUrl));

    expect(cachedResponse?.headers.get('Cache-Control')).toBe(
      `public, max-age=0, s-maxage=${LEGISLATIVE_PROXY_CACHE_TTL_SECONDS}`
    );
    expect(await cachedResponse?.json()).toEqual({ DetalheMateria: { Materia: {} } });
  });

  it('does not cache upstream error responses', async () => {
    const targetUrl = new URL('https://dadosabertos.camara.leg.br/api/v2/deputados/10');
    const cache = new MemoryCache();
    const response = await handleLegislativeProxyRequest(createProxyRequest(targetUrl.toString()), {
      cache,
      fetcher: async () => new Response('indisponivel', { status: 503 })
    });

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(cache.match(buildLegislativeProxyCacheKey(targetUrl))).resolves.toBeUndefined();
  });
});
