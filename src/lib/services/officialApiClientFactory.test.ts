import { describe, expect, it } from 'vitest';
import { CAMARA_API_BASE_URL } from '$lib/api/camaraClient';
import type { LegislativeFallbackEvent } from '$lib/api/legislativeDataSourceConfig';
import { SENADO_API_BASE_URL } from '$lib/api/senadoClient';
import { createOfficialApiClients } from './officialApiClientFactory';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

describe('createOfficialApiClients', () => {
  it('creates direct official clients with an injected fetcher', async () => {
    const calls: string[] = [];
    const { config, camaraClient, senadoClient } = createOfficialApiClients({
      dataSourceEnv: {},
      fetch: async (input) => {
        calls.push(input);

        if (input.startsWith(CAMARA_API_BASE_URL)) {
          return jsonResponse({
            dados: []
          });
        }

        return jsonResponse({
          ListaParlamentarEmExercicio: {
            Parlamentares: {
              Parlamentar: []
            }
          }
        });
      }
    });

    await camaraClient.getDeputados({
      nome: 'Ana'
    });
    await senadoClient.getSenadoresAtuais();

    expect(config.mode).toBe('direct');
    expect(calls[0]).toContain(`${CAMARA_API_BASE_URL}/deputados`);
    expect(calls[1]).toBe(`${SENADO_API_BASE_URL}/senador/lista/atual.json`);
  });

  it('routes official client requests through the configured public proxy', async () => {
    const calls: string[] = [];
    const { config, camaraClient } = createOfficialApiClients({
      dataSourceEnv: {
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
      },
      fetch: async (input) => {
        calls.push(input);

        return jsonResponse({
          dados: []
        });
      }
    });

    await camaraClient.getProposicoes({
      keywords: 'educacao'
    });

    const proxiedUrl = new URL(calls[0]);

    expect(config.mode).toBe('proxy');
    expect(proxiedUrl.origin + proxiedUrl.pathname).toBe('https://worker.example/legislative');
    expect(proxiedUrl.searchParams.get('url')).toContain(`${CAMARA_API_BASE_URL}/proposicoes`);
    expect(proxiedUrl.searchParams.get('url')).toContain('keywords=educacao');
  });

  it('creates resilient clients in fallback mode that hit direct official API when healthy', async () => {
    const calls: string[] = [];
    const fallbackEvents: LegislativeFallbackEvent[] = [];

    const { config, camaraClient } = createOfficialApiClients({
      dataSourceEnv: {
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
      },
      dataSourceMode: 'fallback',
      onFallback: (event) => fallbackEvents.push(event),
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          dados: [
            {
              id: 99,
              nome: 'Parlamentar Teste'
            }
          ]
        });
      }
    });

    const deputados = await camaraClient.getDeputados({
      nome: 'Teste'
    });

    expect(config.mode).toBe('fallback');
    expect(deputados).toHaveLength(1);
    expect(deputados[0].nome).toBe('Parlamentar Teste');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain(`${CAMARA_API_BASE_URL}/deputados`);
    expect(fallbackEvents).toHaveLength(0);
  });

  it('transparently falls back to proxy when direct call fails with a network exception', async () => {
    const calls: string[] = [];
    const fallbackEvents: LegislativeFallbackEvent[] = [];

    const { config, camaraClient } = createOfficialApiClients({
      dataSourceEnv: {
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
      },
      dataSourceMode: 'fallback',
      onFallback: (event) => fallbackEvents.push(event),
      fetch: async (input) => {
        calls.push(input);

        if (input.startsWith(CAMARA_API_BASE_URL)) {
          throw new TypeError('Failed to fetch (CORS block)');
        }

        return jsonResponse({
          dados: [
            {
              id: 77,
              nome: 'Deputado Resiliente'
            }
          ]
        });
      }
    });

    const deputados = await camaraClient.getDeputados({
      nome: 'Resiliente'
    });

    expect(config.mode).toBe('fallback');
    expect(deputados).toHaveLength(1);
    expect(deputados[0].nome).toBe('Deputado Resiliente');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain(`${CAMARA_API_BASE_URL}/deputados`);

    const proxiedUrl = new URL(calls[1]);
    expect(proxiedUrl.origin + proxiedUrl.pathname).toBe('https://worker.example/legislative');
    expect(proxiedUrl.searchParams.get('url')).toContain(`${CAMARA_API_BASE_URL}/deputados`);

    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0].reason).toBe('network-error');
  });

  it('transparently falls back to proxy when direct call returns HTTP 503', async () => {
    const calls: string[] = [];
    const fallbackEvents: LegislativeFallbackEvent[] = [];

    const { config, senadoClient } = createOfficialApiClients({
      dataSourceEnv: {
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative',
        PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE: 'fallback'
      },
      onFallback: (event) => fallbackEvents.push(event),
      fetch: async (input) => {
        calls.push(input);

        if (input.startsWith(SENADO_API_BASE_URL)) {
          return jsonResponse({ error: 'Gateway Temporarily Unavailable' }, 503);
        }

        return jsonResponse({
          DetalheMateria: {
            Materia: {
              IdentificacaoMateria: {
                CodigoMateria: '12345',
                SiglaSubtipoMateria: 'PL',
                NumeroMateria: '1234',
                AnoMateria: '2024'
              }
            }
          }
        });
      }
    });

    const materia = await senadoClient.getMateriaById('12345');

    expect(config.mode).toBe('fallback');
    expect(materia.IdentificacaoMateria?.CodigoMateria).toBe('12345');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain(`${SENADO_API_BASE_URL}/materia/12345.json`);

    const proxiedUrl = new URL(calls[1]);
    expect(proxiedUrl.origin + proxiedUrl.pathname).toBe('https://worker.example/legislative');

    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0].reason).toBe('server-error');
    expect(fallbackEvents[0].status).toBe(503);
  });

  it('shares an in-memory cache instance between camaraClient and senadoClient by default', async () => {
    let camaraFetchCount = 0;
    let senadoFetchCount = 0;

    const clients = createOfficialApiClients({
      fetch: async (input) => {
        if (input.startsWith(CAMARA_API_BASE_URL)) {
          camaraFetchCount++;
          return jsonResponse({ dados: [] });
        }

        senadoFetchCount++;
        return jsonResponse({
          DetalheParlamentar: {
            Parlamentar: {
              IdentificacaoParlamentar: {
                CodigoParlamentar: '5953'
              }
            }
          }
        });
      }
    });

    expect(clients.cache).toBeDefined();

    // Primeira consulta a Camara
    await clients.camaraClient.getDeputados({ nome: 'Ana' });
    expect(camaraFetchCount).toBe(1);

    // Segunda consulta idêntica a Camara (deve vir do cache compartilhado)
    await clients.camaraClient.getDeputados({ nome: 'Ana' });
    expect(camaraFetchCount).toBe(1);

    // Primeira consulta ao Senado
    await clients.senadoClient.getSenadorById('5953');
    expect(senadoFetchCount).toBe(1);

    // Segunda consulta idêntica ao Senado (deve vir do cache compartilhado)
    await clients.senadoClient.getSenadorById('5953');
    expect(senadoFetchCount).toBe(1);

    const stats = clients.cache?.getStats?.();
    expect(stats?.hits).toBe(2);
    expect(stats?.sets).toBe(2);
  });

  it('disables caching when cache: null is explicitly provided', async () => {
    let fetchCount = 0;
    const clients = createOfficialApiClients({
      cache: null,
      fetch: async () => {
        fetchCount++;
        return jsonResponse({ dados: [] });
      }
    });

    expect(clients.cache).toBeNull();

    await clients.camaraClient.getDeputados({ nome: 'Ana' });
    await clients.camaraClient.getDeputados({ nome: 'Ana' });

    expect(fetchCount).toBe(2);
  });
});
