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

  it('fetches current senators from the list envelope', async () => {
    const calls: string[] = [];
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          ListaParlamentarEmExercicio: {
            Parlamentares: {
              Parlamentar: [
                {
                  IdentificacaoParlamentar: {
                    CodigoParlamentar: '5672',
                    NomeParlamentar: 'Alan Rick'
                  }
                },
                {
                  IdentificacaoParlamentar: {
                    CodigoParlamentar: '5987',
                    NomeParlamentar: 'Maria Souza'
                  }
                }
              ]
            }
          }
        });
      }
    });

    const senators = await client.getSenadoresAtuais();

    expect(senators).toHaveLength(2);
    expect(senators[0]).toMatchObject({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '5672',
        NomeParlamentar: 'Alan Rick'
      }
    });
    expect(calls[0]).toBe('https://senado.example/dadosabertos/senador/lista/atual.json');
  });

  it('fetches senator mandates from the official nested envelope', async () => {
    const calls: string[] = [];
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          MandatosParlamentar: {
            Parlamentar: {
              Mandatos: {
                Mandato: [
                  {
                    CodigoMandato: '100',
                    DescricaoParticipacao: 'Titular',
                    PrimeiraLegislaturaDoMandato: {
                      DataInicio: '2023-02-01'
                    },
                    SegundaLegislaturaDoMandato: {
                      DataFim: '2031-01-31'
                    }
                  }
                ]
              }
            }
          }
        });
      }
    });

    const mandates = await client.getSenadorMandatosById(5672);

    expect(mandates).toEqual([
      {
        CodigoMandato: '100',
        DescricaoParticipacao: 'Titular',
        PrimeiraLegislaturaDoMandato: {
          DataInicio: '2023-02-01'
        },
        SegundaLegislaturaDoMandato: {
          DataFim: '2031-01-31'
        }
      }
    ]);
    expect(calls[0]).toBe('https://senado.example/dadosabertos/senador/5672/mandatos.json');
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

  it('fetches a modern legislative process detail by process id', async () => {
    const calls: string[] = [];
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          id: 9046221,
          codigoMateria: 174108,
          identificacao: 'RQS 368/2026',
          sigla: 'RQS',
          numero: '368',
          ano: 2026,
          conteudo: {
            tipo: 'Urgencia para materia',
            ementa: 'Requer urgencia para materia.'
          },
          documento: {
            dataApresentacao: '2026-05-12',
            url: 'https://legis.senado.gov.br/sdleg-getter/documento?dm=10220595'
          }
        });
      }
    });

    await expect(client.getProcessoById(9046221)).resolves.toMatchObject({
      id: 9046221,
      codigoMateria: 174108,
      identificacao: 'RQS 368/2026',
      conteudo: {
        ementa: 'Requer urgencia para materia.'
      }
    });
    expect(calls[0]).toBe('https://senado.example/dadosabertos/processo/9046221.json');
  });

  it('searches modern legislative processes by free term', async () => {
    const calls: string[] = [];
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse([
          {
            id: 9046221,
            codigoMateria: 174108,
            identificacao: 'RQS 368/2026',
            ementa: 'Requer urgencia para materia.'
          }
        ]);
      }
    });

    const processos = await client.searchProcessos({
      termo: 'internet'
    });
    const url = new URL(calls[0]);

    expect(processos).toEqual([
      {
        id: 9046221,
        codigoMateria: 174108,
        identificacao: 'RQS 368/2026',
        ementa: 'Requer urgencia para materia.'
      }
    ]);
    expect(url.origin + url.pathname).toBe('https://senado.example/dadosabertos/processo.json');
    expect(url.searchParams.get('termo')).toBe('internet');
  });

  it('searches modern legislative processes by structured identifier filters', async () => {
    const calls: string[] = [];
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse([]);
      }
    });

    await client.searchProcessos({
      sigla: 'RQS',
      numero: '368',
      ano: 2026
    });
    const url = new URL(calls[0]);

    expect(url.origin + url.pathname).toBe('https://senado.example/dadosabertos/processo.json');
    expect(url.searchParams.get('sigla')).toBe('RQS');
    expect(url.searchParams.get('numero')).toBe('368');
    expect(url.searchParams.get('ano')).toBe('2026');
  });

  it('keeps the deprecated matter search endpoint available as legacy compatibility', async () => {
    const calls: string[] = [];
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      fetch: async (input) => {
        calls.push(input);
        return jsonResponse({
          PesquisaBasicaMateria: {
            Materias: {
              Materia: {
                IdentificacaoMateria: {
                  CodigoMateria: '45',
                  DescricaoIdentificacaoMateria: 'DIV 7/1999'
                }
              }
            }
          }
        });
      }
    });

    const matters = await client.searchMaterias({
      termo: 'educacao'
    });
    const url = new URL(calls[0]);

    expect(matters).toEqual([
      {
        IdentificacaoMateria: {
          CodigoMateria: '45',
          DescricaoIdentificacaoMateria: 'DIV 7/1999'
        }
      }
    ]);
    expect(url.origin + url.pathname).toBe(
      'https://senado.example/dadosabertos/materia/pesquisa/lista.json'
    );
    expect(url.searchParams.get('termo')).toBe('educacao');
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

  it('represents requests that exceed the configured timeout', async () => {
    let signal: AbortSignal | undefined;
    const client = new SenadoApiClient({
      baseUrl: 'https://senado.example/dadosabertos',
      timeoutMs: 1,
      fetch: async (_input, init) => {
        signal = init?.signal ?? undefined;

        return new Promise<Response>(() => undefined);
      }
    });

    await expect(client.getMateriaById(45)).rejects.toMatchObject({
      name: 'SenadoApiClientError',
      kind: 'timeout',
      url: 'https://senado.example/dadosabertos/materia/45.json'
    });
    expect(signal?.aborted).toBe(true);
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
