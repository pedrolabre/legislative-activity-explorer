import { describe, expect, it } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import { SenadoApiClientError } from '$lib/api/senadoClient';
import {
  getOfficialParliamentarianDetail,
  getOfficialProposalDetail,
  getOfficialProposalsByParliamentarian,
  type OfficialCamaraDetailClient,
  type OfficialSenadoDetailClient
} from './officialDetailService';

function createEmptyCamaraClient(): OfficialCamaraDetailClient {
  return {
    getDeputadoById: async () => ({
      id: 10
    }),
    getProposicoesByDeputadoAutor: async () => [],
    getProposicaoById: async () => ({
      id: 100
    })
  };
}

function createEmptySenadoClient(): OfficialSenadoDetailClient {
  return {
    getSenadorById: async () => ({
      IdentificacaoParlamentar: {
        CodigoParlamentar: '20'
      }
    }),
    getMateriaById: async () => ({
      IdentificacaoMateria: {
        CodigoMateria: '300'
      }
    })
  };
}

describe('getOfficialParliamentarianDetail', () => {
  it('loads and maps a Camara deputy detail by official source id', async () => {
    let requestedId: string | number | undefined;
    const camaraClient: OfficialCamaraDetailClient = {
      ...createEmptyCamaraClient(),
      getDeputadoById: async (id) => {
        requestedId = id;
        return {
          id: 10,
          nomeCivil: 'Ana Costa Pereira',
          ultimoStatus: {
            nomeEleitoral: 'Ana Costa',
            siglaPartido: 'ABC',
            siglaUf: 'MG'
          }
        };
      }
    };

    const result = await getOfficialParliamentarianDetail(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient,
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(requestedId).toBe('10');
    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'camara-10',
        fullName: 'Ana Costa Pereira',
        party: 'ABC',
        state: 'MG'
      },
      errors: []
    });
  });

  it('loads and maps a Senado senator detail by official source id', async () => {
    const result = await getOfficialParliamentarianDetail(
      {
        id: 'senado-20',
        source: 'senado',
        sourceId: '20',
        name: 'Maria Souza',
        office: 'Senador'
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getSenadorById: async () => ({
            IdentificacaoParlamentar: {
              CodigoParlamentar: '20',
              NomeParlamentar: 'Maria Souza',
              CodigoPublicoNaLegAtual: '700',
              SiglaPartidoParlamentar: 'DEF',
              UfParlamentar: 'SP'
            }
          })
        }
      }
    );

    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'senado-20',
        party: 'DEF',
        state: 'SP'
      },
      errors: []
    });
  });

  it('represents client failures as recoverable detail failures', async () => {
    const result = await getOfficialParliamentarianDetail(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getDeputadoById: async () => {
            throw new CamaraApiClientError('A API da Camara retornou uma falha HTTP.', {
              kind: 'http',
              status: 503
            });
          }
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result).toEqual({
      status: 'failed',
      data: null,
      errors: [
        {
          source: 'camara',
          entity: 'parliamentarian',
          kind: 'client',
          message:
            'Dados oficiais de parlamentar da Câmara dos Deputados não puderam ser carregados neste momento.'
        }
      ]
    });
  });
});

describe('getOfficialProposalsByParliamentarian', () => {
  it('loads Camara propositions associated by deputy authorship', async () => {
    let requestedDeputyId: string | number | undefined;
    const result = await getOfficialProposalsByParliamentarian(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicoesByDeputadoAutor: async (deputyId) => {
            requestedDeputyId = deputyId;
            return [
              {
                id: 100,
                siglaTipo: 'PL',
                numero: 2,
                ano: 2024,
                ementa: 'Trata de transparencia de dados publicos.'
              }
            ];
          }
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(requestedDeputyId).toBe('10');
    expect(result.status).toBe('fulfilled');
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'camara-proposicao-100',
        title: 'PL 2/2024',
        relationship: 'Autoria',
        officialSummary: 'Trata de transparencia de dados publicos.'
      })
    ]);
  });

  it('keeps valid Camara propositions and reports mapper errors as partial data', async () => {
    const result = await getOfficialProposalsByParliamentarian(
      {
        id: 'camara-10',
        source: 'camara',
        sourceId: '10',
        name: 'Ana Costa',
        office: 'Deputado federal'
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicoesByDeputadoAutor: async () => [
            {
              siglaTipo: 'PL'
            },
            {
              id: 100,
              siglaTipo: 'PL',
              numero: 2,
              ano: 2024
            }
          ]
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result.status).toBe('partial');
    expect(result.data.map((proposal) => proposal.id)).toEqual(['camara-proposicao-100']);
    expect(result.errors).toEqual([
      expect.objectContaining({
        source: 'camara',
        entity: 'parliamentarian-proposals',
        kind: 'mapper',
        message:
          'Dados oficiais de proposições associadas da Câmara dos Deputados vieram incompletos nesta consulta.'
      })
    ]);
  });

  it('represents Senado associated matters as unavailable in this block', async () => {
    const result = await getOfficialProposalsByParliamentarian(
      {
        id: 'senado-20',
        source: 'senado',
        sourceId: '20',
        name: 'Maria Souza',
        office: 'Senador'
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result).toEqual({
      status: 'unavailable',
      data: [],
      errors: [
        {
          source: 'senado',
          entity: 'parliamentarian-proposals',
          kind: 'unsupported-source',
          message:
            'Dados oficiais de proposições associadas do Senado Federal não estão disponíveis nesta consulta.'
        }
      ]
    });
  });
});

describe('getOfficialProposalDetail', () => {
  it('loads a Camara proposition detail by official source id', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'camara-proposicao-100',
        source: 'camara',
        sourceId: '100',
        title: 'PL 2/2024',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async () => ({
            id: 100,
            siglaTipo: 'PL',
            numero: 2,
            ano: 2024,
            ementa: 'Detalhe oficial da proposicao.'
          })
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'camara-proposicao-100',
        officialSummary: 'Detalhe oficial da proposicao.'
      },
      errors: []
    });
  });

  it('applies catalog references when the official proposal id is cataloged', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'bill-pl-220-2025',
        source: 'camara',
        sourceId: '220',
        title: 'PL 220/2025',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async () => ({
            id: 220,
            siglaTipo: 'PL',
            numero: 220,
            ano: 2025
          })
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result.data?.references).toEqual([
      expect.objectContaining({
        id: 'bill-pl-220-2025-official-camara',
        type: 'official',
        checkedAt: '2026-06-29'
      })
    ]);
  });

  it('applies reviewed factual summary when the selected proposal id is cataloged', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'bill-pl-1234-2024',
        source: 'camara',
        sourceId: '1234',
        title: 'PL 1234/2024',
        type: 'PL',
        references: []
      },
      {
        camaraClient: {
          ...createEmptyCamaraClient(),
          getProposicaoById: async () => ({
            id: 1234,
            siglaTipo: 'PL',
            numero: 1234,
            ano: 2024,
            ementa: 'Ementa oficial retornada pela Camara.'
          })
        },
        senadoClient: createEmptySenadoClient()
      }
    );

    expect(result.data).toMatchObject({
      id: 'camara-proposicao-1234',
      officialSummary: 'Ementa oficial retornada pela Camara.',
      simplifiedSummary:
        'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.'
    });
  });

  it('loads a Senado matter detail by official source id', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'senado-materia-300',
        source: 'senado',
        sourceId: '300',
        title: 'PLS 3/2024',
        type: 'PLS',
        references: []
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getMateriaById: async () => ({
            IdentificacaoMateria: {
              CodigoMateria: '300',
              SiglaSubtipoMateria: 'PLS',
              NumeroMateria: '00003',
              AnoMateria: '2024'
            },
            DadosBasicosMateria: {
              EmentaMateria: 'Detalhe oficial da materia.'
            }
          })
        }
      }
    );

    expect(result).toMatchObject({
      status: 'fulfilled',
      data: {
        id: 'senado-materia-300',
        title: 'PLS 3/2024',
        officialSummary: 'Detalhe oficial da materia.'
      },
      errors: []
    });
  });

  it('represents proposal detail timeouts as recoverable failures', async () => {
    const result = await getOfficialProposalDetail(
      {
        id: 'senado-materia-300',
        source: 'senado',
        sourceId: '300',
        title: 'PLS 3/2024',
        type: 'PLS',
        references: []
      },
      {
        camaraClient: createEmptyCamaraClient(),
        senadoClient: {
          ...createEmptySenadoClient(),
          getMateriaById: async () => {
            throw new SenadoApiClientError('timeout', {
              kind: 'timeout'
            });
          }
        }
      }
    );

    expect(result).toEqual({
      status: 'failed',
      data: null,
      errors: [
        {
          source: 'senado',
          entity: 'proposal',
          kind: 'timeout',
          message: 'A consulta oficial do Senado Federal excedeu o tempo limite.'
        }
      ]
    });
  });
});
