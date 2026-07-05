import { describe, expect, it } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import {
  emptyOfficialSearchResult,
  parseDirectProposalQuery,
  searchOfficialRecords,
  type OfficialCamaraSearchClient,
  type OfficialSenadoSearchClient
} from './officialSearchService';

function createEmptySenadoClient(): OfficialSenadoSearchClient {
  return {
    getSenadoresAtuais: async () => [],
    searchProcessos: async () => []
  };
}

describe('searchOfficialRecords', () => {
  it('recognizes national legislative identifier formats scoped to the parser', () => {
    expect(parseDirectProposalQuery('PL2630')).toEqual({
      type: 'PL',
      number: '2630',
      year: undefined,
      label: 'PL 2630'
    });
    expect(parseDirectProposalQuery('PL-2630')).toEqual({
      type: 'PL',
      number: '2630',
      year: undefined,
      label: 'PL 2630'
    });
    expect(parseDirectProposalQuery('PL 2630/2020')).toEqual({
      type: 'PL',
      number: '2630',
      year: 2020,
      label: 'PL 2630/2020'
    });
    expect(parseDirectProposalQuery('PEC 45')).toEqual({
      type: 'PEC',
      number: '45',
      year: undefined,
      label: 'PEC 45'
    });
    expect(parseDirectProposalQuery('PLP 19/2023')).toEqual({
      type: 'PLP',
      number: '19',
      year: 2023,
      label: 'PLP 19/2023'
    });
    expect(parseDirectProposalQuery('PDC 100/2019')?.type).toBe('PDC');
    expect(parseDirectProposalQuery('PDL 508/2021')?.type).toBe('PDL');
    expect(parseDirectProposalQuery('MPV 1300/2025')?.type).toBe('MPV');
    expect(parseDirectProposalQuery('REQ 10/2024')?.type).toBe('REQ');
    expect(parseDirectProposalQuery('RQS 368/2026')?.type).toBe('RQS');
    expect(parseDirectProposalQuery('RQN 1/2024')?.type).toBe('RQN');
    expect(parseDirectProposalQuery('MSC 123/2023')?.type).toBe('MSC');
  });

  it('combines official sources into separated domain result groups', async () => {
    let camaraDeputadosOptions: unknown;
    let camaraProposicoesOptions: unknown;
    let senadoProcessoOptions: unknown;

    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async (options) => {
        camaraDeputadosOptions = options;
        return [
          {
            id: 10,
            nome: 'Ana Costa',
            siglaPartido: 'ABC',
            siglaUf: 'MG'
          }
        ];
      },
      getProposicoes: async (options) => {
        camaraProposicoesOptions = options;
        return [
          {
            id: 100,
            siglaTipo: 'PL',
            numero: 2,
            ano: 2024,
            ementa: 'Trata de consulta publica sobre Ana.'
          }
        ];
      }
    };
    const senadoClient: OfficialSenadoSearchClient = {
      getSenadoresAtuais: async () => [
        {
          IdentificacaoParlamentar: {
            CodigoParlamentar: '20',
            NomeParlamentar: 'Ana Paula',
            SiglaPartidoParlamentar: 'DEF',
            UfParlamentar: 'SP'
          }
        },
        {
          IdentificacaoParlamentar: {
            CodigoParlamentar: '21',
            NomeParlamentar: 'Bruno Lima'
          }
        }
      ],
      searchProcessos: async (options) => {
        senadoProcessoOptions = options;
        return [
          {
            id: 300,
            codigoMateria: 301,
            identificacao: 'PLS 3/2024',
            ementa: 'Materia relacionada a Ana.'
          }
        ];
      }
    };

    const result = await searchOfficialRecords(' Ana ', {
      camaraClient,
      senadoClient,
      limits: {
        parliamentariansPerSource: 5,
        proposalsPerSource: 5
      }
    });

    expect(camaraDeputadosOptions).toMatchObject({
      nome: 'Ana',
      itens: 5,
      ordem: 'ASC',
      ordenarPor: 'nome'
    });
    expect(camaraProposicoesOptions).toMatchObject({
      keywords: 'Ana',
      itens: 5
    });
    expect(senadoProcessoOptions).toEqual({
      termo: 'Ana'
    });
    expect(result.query).toBe('Ana');
    expect(result.parliamentarians.map((parliamentarian) => parliamentarian.id)).toEqual([
      'camara-10',
      'senado-20'
    ]);
    expect(result.proposals.map((proposal) => proposal.id).sort()).toEqual([
      'camara-proposicao-100',
      'senado-processo-300'
    ]);
    expect(result.sources).toEqual([
      {
        source: 'camara',
        status: 'fulfilled',
        parliamentarianCount: 1,
        proposalCount: 1,
        errors: []
      },
      {
        source: 'senado',
        status: 'fulfilled',
        parliamentarianCount: 1,
        proposalCount: 1,
        errors: []
      }
    ]);
  });

  it('uses official Camara proposition filters for a direct proposal query with year', async () => {
    let camaraDeputadosCalled = false;
    let senadoSenadoresCalled = false;
    let camaraProposicoesOptions: unknown;
    let senadoProcessoOptions: unknown;

    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        camaraDeputadosCalled = true;
        return [];
      },
      getProposicoes: async (options) => {
        camaraProposicoesOptions = options;
        return [
          {
            id: 2630,
            siglaTipo: 'PL',
            numero: 2630,
            ano: 2020,
            ementa: 'Ementa oficial controlada.'
          }
        ];
      }
    };
    const senadoClient: OfficialSenadoSearchClient = {
      getSenadoresAtuais: async () => {
        senadoSenadoresCalled = true;
        return [];
      },
      searchProcessos: async (options) => {
        senadoProcessoOptions = options;
        return [];
      }
    };

    const result = await searchOfficialRecords('PL 2630/2020', {
      camaraClient,
      senadoClient,
      limits: {
        proposalsPerSource: 5
      }
    });

    expect(camaraDeputadosCalled).toBe(false);
    expect(senadoSenadoresCalled).toBe(false);
    expect(camaraProposicoesOptions).toMatchObject({
      siglaTipo: 'PL',
      numero: '2630',
      ano: 2020,
      itens: 5
    });
    expect(camaraProposicoesOptions).not.toMatchObject({
      keywords: expect.any(String)
    });
    expect(senadoProcessoOptions).toEqual({
      sigla: 'PL',
      numero: '2630',
      ano: 2020
    });
    expect(result.directProposalResolution).toBe('single');
    expect(result.directProposal?.id).toBe('camara-proposicao-2630');
    expect(result.parliamentarians).toEqual([]);
  });

  it('uses modern Senado process filters for a direct Senado matter query with year', async () => {
    let camaraProposicoesCalled = false;
    let senadoProcessoOptions: unknown;

    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => [],
      getProposicoes: async () => {
        camaraProposicoesCalled = true;
        return [];
      }
    };
    const senadoClient: OfficialSenadoSearchClient = {
      getSenadoresAtuais: async () => [],
      searchProcessos: async (options) => {
        senadoProcessoOptions = options;
        return [
          {
            id: 9046221,
            codigoMateria: 174108,
            identificacao: 'RQS 368/2026',
            ementa: 'Requer urgencia para materia.',
            situacaoAtual: 'PRONTO PARA DELIBERACAO DO PLENARIO',
            dataApresentacao: '2026-05-12'
          }
        ];
      }
    };

    const result = await searchOfficialRecords('RQS 368/2026', {
      camaraClient,
      senadoClient
    });

    expect(camaraProposicoesCalled).toBe(false);
    expect(senadoProcessoOptions).toEqual({
      sigla: 'RQS',
      numero: '368',
      ano: 2026
    });
    expect(result.directProposalResolution).toBe('single');
    expect(result.directProposal).toMatchObject({
      id: 'senado-processo-9046221',
      sourceId: '9046221',
      title: 'RQS 368/2026',
      type: 'RQS',
      number: '368',
      year: 2026,
      officialSummary: 'Requer urgencia para materia.'
    });
    expect(result.parliamentarians).toEqual([]);
  });

  it('uses official Camara proposition filters for compact and hyphenated identifiers', async () => {
    const camaraCalls: unknown[] = [];
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => [],
      getProposicoes: async (options) => {
        camaraCalls.push(options);
        return [
          {
            id: 2630,
            siglaTipo: 'PL',
            numero: 2630,
            ano: 2020
          }
        ];
      }
    };

    await searchOfficialRecords('PL2630', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });
    await searchOfficialRecords('PL-2630', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });

    expect(camaraCalls).toEqual([
      expect.objectContaining({
        siglaTipo: 'PL',
        numero: '2630',
        ano: undefined
      }),
      expect.objectContaining({
        siglaTipo: 'PL',
        numero: '2630',
        ano: undefined
      })
    ]);
  });

  it('uses explicit national legislative types in direct official searches', async () => {
    let camaraProposicoesOptions: unknown;
    let senadoProcessoOptions: unknown;

    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => [],
      getProposicoes: async (options) => {
        camaraProposicoesOptions = options;
        return [
          {
            id: 1300,
            siglaTipo: 'MPV',
            numero: 1300,
            ano: 2025
          }
        ];
      }
    };
    const senadoClient: OfficialSenadoSearchClient = {
      getSenadoresAtuais: async () => [],
      searchProcessos: async (options) => {
        senadoProcessoOptions = options;
        return [];
      }
    };

    const result = await searchOfficialRecords('MPV 1300/2025', {
      camaraClient,
      senadoClient
    });

    expect(camaraProposicoesOptions).toMatchObject({
      siglaTipo: 'MPV',
      numero: '1300',
      ano: 2025
    });
    expect(senadoProcessoOptions).toEqual({
      sigla: 'MPV',
      numero: '1300',
      ano: 2025
    });
    expect(result.directProposalResolution).toBe('single');
    expect(result.directProposal?.title).toBe('MPV 1300/2025');
  });

  it('does not confuse parliamentarian names with direct legislative identifiers', async () => {
    let camaraDeputadosOptions: unknown;
    let camaraProposicoesOptions: unknown;

    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async (options) => {
        camaraDeputadosOptions = options;
        return [
          {
            id: 10,
            nome: 'Plinio Valerio'
          }
        ];
      },
      getProposicoes: async (options) => {
        camaraProposicoesOptions = options;
        return [];
      }
    };

    const result = await searchOfficialRecords('Plinio Valerio', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });

    expect(camaraDeputadosOptions).toMatchObject({
      nome: 'Plinio Valerio'
    });
    expect(camaraProposicoesOptions).toMatchObject({
      keywords: 'Plinio Valerio'
    });
    expect(result.directProposalResolution).toBe('not-direct-query');
    expect(result.parliamentarians.map((parliamentarian) => parliamentarian.name)).toEqual([
      'Plinio Valerio'
    ]);
  });

  it('returns a specific invalid resolution without touching official clients', async () => {
    let calls = 0;
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        calls += 1;
        return [];
      },
      getProposicoes: async () => {
        calls += 1;
        return [];
      }
    };
    const senadoClient: OfficialSenadoSearchClient = {
      getSenadoresAtuais: async () => {
        calls += 1;
        return [];
      },
      searchProcessos: async () => {
        calls += 1;
        return [];
      }
    };

    const result = await searchOfficialRecords('PL 2630/20', {
      camaraClient,
      senadoClient
    });

    expect(calls).toBe(0);
    expect(result).toMatchObject({
      query: 'PL 2630/20',
      parliamentarians: [],
      proposals: [],
      sources: [],
      directProposalError:
        'Identificador legislativo incompleto. Use formatos como PL 2630/2020, PL-2630 ou PEC 45.',
      directProposalResolution: 'invalid'
    });
  });

  it('keeps direct proposal queries with multiple exact official matches in the result list', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => [],
      getProposicoes: async () => [
        {
          id: 451,
          siglaTipo: 'PEC',
          numero: 45,
          ano: 2019
        },
        {
          id: 452,
          siglaTipo: 'PEC',
          numero: 45,
          ano: 2023
        }
      ]
    };

    const result = await searchOfficialRecords('PEC 45', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });

    expect(result.directProposalResolution).toBe('ambiguous');
    expect(result.directProposal).toBeUndefined();
    expect(result.proposals.map((proposal) => proposal.id)).toEqual([
      'camara-proposicao-451',
      'camara-proposicao-452'
    ]);
  });

  it('orders exact and prefix text matches before looser matches', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => [
        {
          id: 1,
          nome: 'Mariana Ana'
        }
      ],
      getProposicoes: async () => []
    };
    const senadoClient: OfficialSenadoSearchClient = {
      getSenadoresAtuais: async () => [
        {
          IdentificacaoParlamentar: {
            CodigoParlamentar: '2',
            NomeParlamentar: 'Ana Maria'
          }
        }
      ],
      searchProcessos: async () => []
    };

    const result = await searchOfficialRecords('ana', {
      camaraClient,
      senadoClient
    });

    expect(result.parliamentarians.map((parliamentarian) => parliamentarian.name)).toEqual([
      'Ana Maria',
      'Mariana Ana'
    ]);
  });

  it('represents partial source failures without dropping successful groups', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        throw new CamaraApiClientError('A API da Camara retornou uma falha HTTP.', {
          kind: 'http',
          status: 503
        });
      },
      getProposicoes: async () => [
        {
          id: 100,
          siglaTipo: 'PL',
          numero: 2,
          ano: 2024
        }
      ]
    };

    const result = await searchOfficialRecords('educacao', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });
    const camaraReport = result.sources.find((source) => source.source === 'camara');

    expect(result.proposals.map((proposal) => proposal.id)).toEqual(['camara-proposicao-100']);
    expect(camaraReport).toMatchObject({
      status: 'partial',
      parliamentarianCount: 0,
      proposalCount: 1
    });
    expect(camaraReport?.errors).toEqual([
      {
        source: 'camara',
        group: 'parliamentarians',
        kind: 'client',
        message: 'A fonte oficial da Câmara dos Deputados não pode ser consultada neste momento.'
      }
    ]);
  });

  it('represents source timeouts with a neutral recoverable message', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        throw new CamaraApiClientError('timeout', {
          kind: 'timeout'
        });
      },
      getProposicoes: async () => []
    };

    const result = await searchOfficialRecords('ana', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });
    const camaraReport = result.sources.find((source) => source.source === 'camara');

    expect(camaraReport).toMatchObject({
      status: 'partial',
      parliamentarianCount: 0,
      proposalCount: 0
    });
    expect(camaraReport?.errors).toEqual([
      {
        source: 'camara',
        group: 'parliamentarians',
        kind: 'timeout',
        message: 'A consulta oficial da Câmara dos Deputados excedeu o tempo limite.'
      }
    ]);
  });

  it('keeps valid mapped items and reports invalid payloads as recoverable mapper errors', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => [
        {
          nome: 'Sem identificador'
        },
        {
          id: 30,
          nome: 'Ana Costa'
        }
      ],
      getProposicoes: async () => []
    };

    const result = await searchOfficialRecords('ana', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });
    const camaraReport = result.sources.find((source) => source.source === 'camara');

    expect(result.parliamentarians.map((parliamentarian) => parliamentarian.id)).toEqual([
      'camara-30'
    ]);
    expect(camaraReport?.status).toBe('partial');
    expect(camaraReport?.errors).toHaveLength(1);
    expect(camaraReport?.errors[0]).toMatchObject({
      source: 'camara',
      group: 'parliamentarians',
      kind: 'mapper',
      message:
        'Dados oficiais de parlamentares da Câmara dos Deputados vieram incompletos nesta consulta.'
    });
  });

  it('deduplicates only by normalized domain id', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => [
        {
          id: 30,
          nome: 'Ana Costa'
        },
        {
          id: 30,
          nome: 'Ana Costa'
        }
      ],
      getProposicoes: async () => [
        {
          id: 100,
          siglaTipo: 'PL',
          numero: 2,
          ano: 2024
        },
        {
          id: 100,
          siglaTipo: 'PL',
          numero: 2,
          ano: 2024
        }
      ]
    };

    const result = await searchOfficialRecords('ana', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });

    expect(result.parliamentarians).toHaveLength(1);
    expect(result.proposals).toHaveLength(1);
  });

  it('returns an empty result without touching clients for an empty query', async () => {
    let calls = 0;
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        calls += 1;
        return [];
      },
      getProposicoes: async () => {
        calls += 1;
        return [];
      }
    };

    const result = await searchOfficialRecords('   ', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });

    expect(result).toBe(emptyOfficialSearchResult);
    expect(calls).toBe(0);
  });

  it('marks a source as failed when all its groups fail', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        throw new Error('Falha ao buscar deputados.');
      },
      getProposicoes: async () => {
        throw new Error('Falha ao buscar proposicoes.');
      }
    };

    const result = await searchOfficialRecords('ana', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });
    const camaraReport = result.sources.find((source) => source.source === 'camara');

    expect(camaraReport).toMatchObject({
      status: 'failed',
      parliamentarianCount: 0,
      proposalCount: 0
    });
    expect(camaraReport?.errors).toHaveLength(2);
    expect(result.parliamentarians).toEqual([]);
    expect(result.proposals).toEqual([]);
  });
});
