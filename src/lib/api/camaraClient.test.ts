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

  it('fetches deputies by name with explicit search parameters', async () => {
    const calls: string[] = [];
    const fetcher: CamaraFetch = async (input) => {
      calls.push(input);
      return jsonResponse({
        dados: [
          {
            id: 10,
            nome: 'Ana Costa',
            siglaPartido: 'XYZ'
          }
        ]
      });
    };

    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: fetcher
    });

    const deputies = await client.getDeputados({
      nome: 'Ana',
      itens: 20,
      ordem: 'ASC',
      ordenarPor: 'nome'
    });
    const url = new URL(calls[0]);

    expect(deputies).toEqual([
      {
        id: 10,
        nome: 'Ana Costa',
        siglaPartido: 'XYZ'
      }
    ]);
    expect(url.origin + url.pathname).toBe('https://dados.example/api/v2/deputados');
    expect(url.searchParams.get('nome')).toBe('Ana');
    expect(url.searchParams.get('itens')).toBe('20');
    expect(url.searchParams.get('ordem')).toBe('ASC');
    expect(url.searchParams.get('ordenarPor')).toBe('nome');
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

  it('fetches propositions by keyword with official list parameters', async () => {
    const calls: string[] = [];
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          dados: [
            {
              id: 9876,
              siglaTipo: 'PL',
              numero: 1234,
              ano: 2024
            }
          ]
        });
      }
    });

    const propositions = await client.getProposicoes({
      keywords: 'educacao',
      itens: 10
    });
    const url = new URL(calls[0]);

    expect(propositions).toHaveLength(1);
    expect(url.origin + url.pathname).toBe('https://dados.example/api/v2/proposicoes');
    expect(url.searchParams.get('keywords')).toBe('educacao');
    expect(url.searchParams.get('itens')).toBe('10');
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

  it('fetches official proposition themes by id', async () => {
    const calls: string[] = [];
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          dados: [
            {
              codTema: 40,
              tema: 'Educacao',
              relevancia: 1
            }
          ]
        });
      }
    });

    await expect(client.getProposicaoTemasById(9876)).resolves.toEqual([
      {
        codTema: 40,
        tema: 'Educacao',
        relevancia: 1
      }
    ]);
    expect(calls[0]).toBe('https://dados.example/api/v2/proposicoes/9876/temas');
  });

  it('fetches official proposition votes by proposition id with pagination parameters', async () => {
    const calls: string[] = [];
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          dados: [
            {
              id: '9876-1',
              descricao: 'Votacao nominal.'
            }
          ],
          links: [
            {
              rel: 'next',
              href: 'https://dados.example/api/v2/proposicoes/9876/votacoes?pagina=2'
            }
          ]
        });
      }
    });

    await expect(
      client.getProposicaoVotacoesByIdPage(9876, {
        pagina: 1,
        itens: 50
      })
    ).resolves.toEqual({
      data: [
        {
          id: '9876-1',
          descricao: 'Votacao nominal.'
        }
      ],
      links: [
        {
          rel: 'next',
          href: 'https://dados.example/api/v2/proposicoes/9876/votacoes?pagina=2'
        }
      ]
    });

    const url = new URL(calls[0]);

    expect(url.origin + url.pathname).toBe(
      'https://dados.example/api/v2/proposicoes/9876/votacoes'
    );
    expect(url.searchParams.get('pagina')).toBe('1');
    expect(url.searchParams.get('itens')).toBe('50');
  });

  it('fetches an official vote detail by vote id', async () => {
    const calls: string[] = [];
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          dados: {
            id: '9876-1',
            resultado: 'Aprovado'
          }
        });
      }
    });

    await expect(client.getVotacaoById('9876-1')).resolves.toEqual({
      id: '9876-1',
      resultado: 'Aprovado'
    });
    expect(calls[0]).toBe('https://dados.example/api/v2/votacoes/9876-1');
  });

  it('fetches official individual votes by vote id', async () => {
    const calls: string[] = [];
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          dados: [
            {
              tipoVoto: 'Sim',
              deputado_: {
                id: 10,
                nome: 'Ana Costa'
              }
            }
          ]
        });
      }
    });

    await expect(client.getVotacaoVotosById('9876-1')).resolves.toEqual([
      {
        tipoVoto: 'Sim',
        deputado_: {
          id: 10,
          nome: 'Ana Costa'
        }
      }
    ]);
    expect(calls[0]).toBe('https://dados.example/api/v2/votacoes/9876-1/votos');
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

  it('represents requests that exceed the configured timeout', async () => {
    let signal: AbortSignal | undefined;
    const client = new CamaraApiClient({
      baseUrl: 'https://dados.example/api/v2',
      timeoutMs: 1,
      fetch: async (_input, init) => {
        signal = init?.signal ?? undefined;

        return new Promise<Response>(() => undefined);
      }
    });

    await expect(client.getDeputadoById(1)).rejects.toMatchObject({
      name: 'CamaraApiClientError',
      kind: 'timeout',
      url: 'https://dados.example/api/v2/deputados/1'
    });
    expect(signal?.aborted).toBe(true);
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
