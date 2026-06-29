import { describe, expect, it } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import {
  emptyOfficialSearchResult,
  searchOfficialRecords,
  type OfficialCamaraSearchClient,
  type OfficialSenadoSearchClient
} from './officialSearchService';

function createEmptySenadoClient(): OfficialSenadoSearchClient {
  return {
    getSenadoresAtuais: async () => [],
    searchMaterias: async () => []
  };
}

describe('searchOfficialRecords', () => {
  it('combines official sources into separated domain result groups', async () => {
    let camaraDeputadosOptions: unknown;
    let camaraProposicoesOptions: unknown;
    let senadoMateriaOptions: unknown;

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
      searchMaterias: async (options) => {
        senadoMateriaOptions = options;
        return [
          {
            IdentificacaoMateria: {
              CodigoMateria: '300',
              SiglaSubtipoMateria: 'PLS',
              NumeroMateria: '00003',
              AnoMateria: '2024'
            },
            DadosBasicosMateria: {
              EmentaMateria: 'Materia relacionada a Ana.'
            }
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
    expect(senadoMateriaOptions).toEqual({
      termo: 'Ana'
    });
    expect(result.query).toBe('Ana');
    expect(result.parliamentarians.map((parliamentarian) => parliamentarian.id)).toEqual([
      'camara-10',
      'senado-20'
    ]);
    expect(result.proposals.map((proposal) => proposal.id).sort()).toEqual([
      'camara-proposicao-100',
      'senado-materia-300'
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
      searchMaterias: async () => []
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
        message: 'A fonte oficial da Camara dos Deputados nao pode ser consultada neste momento.'
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
        message: 'A consulta oficial da Camara dos Deputados excedeu o tempo limite.'
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
        'Parte dos dados oficiais de parlamentares da Camara dos Deputados veio incompleta e nao foi exibida.'
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
