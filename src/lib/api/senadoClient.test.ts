import { describe, expect, it } from 'vitest';
import { SenadoApiClient, SenadoApiClientError, type SenadoFetch } from './senadoClient';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });
}

describe('SenadoApiClient', () => {
  it('fetches a senator detail from the configured base URL using the JSON suffix', async () => {
    const calls: { input: string; init?: RequestInit }[] = [];
    const fetcher: SenadoFetch = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse({
        DetalheParlamentar: {
          Parlamentar: {
            IdentificacaoParlamentar: {
              CodigoParlamentar: '5672',
              NomeParlamentar: 'Alan Rick'
            }
          }
        }
      });
    };

    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: fetcher
    });

    const senator = await client.getSenadorById(5672);

    expect(senator).toEqual({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '5672',
        NomeParlamentar: 'Alan Rick'
      }
    });
    expect(calls[0]).toMatchObject({
      input: 'https://senado.example/dadosabertos/senador/5672.json',
      init: {
        headers: {
          Accept: 'application/json'
        }
      }
    });
  });

  it('supports JSON through the Accept header without adding the suffix', async () => {
    const calls: string[] = [];
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos/',
      jsonMode: 'accept-header',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          DetalheMateria: {
            Materia: {
              IdentificacaoMateria: {
                CodigoMateria: '45'
              }
            }
          }
        });
      }
    });

    await expect(client.getMateriaById('45')).resolves.toMatchObject({
      IdentificacaoMateria: {
        CodigoMateria: '45'
      }
    });
    expect(calls[0]).toBe('https://senado.example/dadosabertos/materia/45');
  });

  it('accepts the legacy senator envelope documented by the project', async () => {
    const client = new SenadoApiClient({
      fetch: async () =>
        jsonResponse({
          DetalheSenador: {
            IdentificacaoParlamentar: {
              CodigoParlamentar: '5987',
              NomeParlamentar: 'Maria Souza'
            }
          }
        })
    });

    await expect(client.getSenadorById(5987)).resolves.toEqual({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '5987',
        NomeParlamentar: 'Maria Souza'
      }
    });
  });

  it('fetches a matter detail from the Senado envelope', async () => {
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: async () =>
        jsonResponse({
          DetalheMateria: {
            Materia: {
              IdentificacaoMateria: {
                CodigoMateria: '45',
                SiglaSubtipoMateria: 'DIV'
              },
              DadosBasicosMateria: {
                EmentaMateria: 'Encaminha documento ao Senado Federal.'
              }
            }
          }
        })
    });

    await expect(client.getMateriaById(45)).resolves.toMatchObject({
      IdentificacaoMateria: {
        CodigoMateria: '45',
        SiglaSubtipoMateria: 'DIV'
      },
      DadosBasicosMateria: {
        EmentaMateria: 'Encaminha documento ao Senado Federal.'
      }
    });
  });

  it('wraps network failures in a recoverable client error', async () => {
    const client = new SenadoApiClient({
      fetch: async () => {
        throw new Error('connection refused');
      }
    });

    await expect(client.getSenadorById(1)).rejects.toMatchObject({
      name: 'SenadoApiClientError',
      kind: 'network'
    });
  });

  it('represents HTTP failures with status and URL', async () => {
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
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

    await expect(client.getMateriaById(45)).rejects.toMatchObject({
      name: 'SenadoApiClientError',
      kind: 'http',
      status: 503,
      url: 'https://senado.example/dadosabertos/materia/45.json'
    });
  });

  it('rejects invalid JSON payloads', async () => {
    const client = new SenadoApiClient({
      fetch: async () => new Response('not-json', { status: 200 })
    });

    await expect(client.getSenadorById(1)).rejects.toMatchObject({
      name: 'SenadoApiClientError',
      kind: 'invalid-payload'
    });
  });

  it('rejects responses without the expected nested data', async () => {
    const client = new SenadoApiClient({
      fetch: async () =>
        jsonResponse({
          DetalheParlamentar: {}
        })
    });

    await expect(client.getSenadorById(1)).rejects.toBeInstanceOf(SenadoApiClientError);
    await expect(client.getSenadorById(1)).rejects.toMatchObject({
      kind: 'invalid-payload'
    });
  });
});
