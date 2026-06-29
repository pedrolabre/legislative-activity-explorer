import { describe, expect, it } from 'vitest';
import { CamaraApiClient, CamaraApiClientError, type CamaraFetch } from './camaraClient';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });
}

describe('CamaraApiClient', () => {
  it('fetches a deputy detail from the configured base URL', async () => {
    const calls: { input: string; init?: RequestInit }[] = [];
    const fetcher: CamaraFetch = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        dados: {
          id: 204556,
          nomeCivil: 'Pedro Luis Silva'
        }
      });
    };

    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: fetcher
    });

    const deputy = await client.getDeputadoById(204556);

    expect(deputy).toEqual({
      id: 204556,
      nomeCivil: 'Pedro Luis Silva'
    });
    expect(calls[0]).toMatchObject({
      input: 'https://dados.example/api/v2/deputados/204556',
      init: {
        headers: {
          Accept: 'application/json'
        }
      }
    });
  });

  it('fetches propositions by deputy author with explicit pagination parameters', async () => {
    const calls: string[] = [];
    const fetcher: CamaraFetch = async (input) => {
      calls.push(input);
      return jsonResponse({
        dados: [
          {
            id: 9876,
            siglaTipo: 'PL',
            numero: 1234,
            ano: 2024
          }
        ],
        links: [
          {
            rel: 'next',
            href: 'https://dados.example/api/v2/proposicoes?idDeputadoAutor=204556&pagina=3'
          }
        ]
      });
    };

    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2/',
      fetch: fetcher
    });

    const propositions = await client.getProposicoesByDeputadoAutor('204556', {
      pagina: 2,
      itens: 50
    });
    const url = new URL(calls[0]);

    expect(propositions).toHaveLength(1);
    expect(url.origin + url.pathname).toBe('https://dados.example/api/v2/proposicoes');
    expect(url.searchParams.get('idDeputadoAutor')).toBe('204556');
    expect(url.searchParams.get('pagina')).toBe('2');
    expect(url.searchParams.get('itens')).toBe('50');
  });

  it('keeps pagination links available when requesting a proposition page', async () => {
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async () =>
        jsonResponse({
          dados: [
            {
              id: 9876
            }
          ],
          links: [
            {
              rel: 'next',
              href: 'https://dados.example/api/v2/proposicoes?pagina=2'
            }
          ]
        })
    });

    await expect(client.getProposicoesByDeputadoAutorPage(204556)).resolves.toEqual({
      data: [
        {
          id: 9876
        }
      ],
      links: [
        {
          rel: 'next',
          href: 'https://dados.example/api/v2/proposicoes?pagina=2'
        }
      ]
    });
  });

  it('fetches a proposition detail by id', async () => {
    const calls: string[] = [];
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          dados: {
            id: 9876,
            siglaTipo: 'PL'
          }
        });
      }
    });

    await expect(client.getProposicaoById(9876)).resolves.toMatchObject({
      id: 9876,
      siglaTipo: 'PL'
    });
    expect(calls[0]).toBe('https://dados.example/api/v2/proposicoes/9876');
  });

  it('wraps network failures in a recoverable client error', async () => {
    const client = new CamaraApiClient({
      fetch: async () => {
        throw new Error('connection refused');
      }
    });

    await expect(client.getDeputadoById(1)).rejects.toMatchObject({
      name: 'CamaraApiClientError',
      kind: 'network'
    });
  });

  it('represents HTTP failures with status and URL', async () => {
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async () =>
        jsonResponse(
          {
            erro: 'indisponivel'
          },
          {
            status: 503,
            statusText: 'Service Unavailable'
          }
        )
    });

    await expect(client.getDeputadoById(204556)).rejects.toMatchObject({
      name: 'CamaraApiClientError',
      kind: 'http',
      status: 503,
      url: 'https://dados.example/api/v2/deputados/204556'
    });
  });

  it('rejects invalid JSON payloads', async () => {
    const client = new CamaraApiClient({
      fetch: async () => new Response('not-json', { status: 200 })
    });

    await expect(client.getDeputadoById(1)).rejects.toMatchObject({
      name: 'CamaraApiClientError',
      kind: 'invalid-payload'
    });
  });

  it('rejects responses without the expected data envelope', async () => {
    const client = new CamaraApiClient({
      fetch: async () => jsonResponse({ links: [] })
    });

    await expect(client.getDeputadoById(1)).rejects.toBeInstanceOf(CamaraApiClientError);
    await expect(client.getDeputadoById(1)).rejects.toMatchObject({
      kind: 'invalid-payload'
    });
  });
});
