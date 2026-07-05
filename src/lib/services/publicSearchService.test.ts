import { describe, expect, it } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import { SenadoApiClientError } from '$lib/api/senadoClient';
import {
  getDirectProposalSearchMessage,
  getOfficialSearchRecoverableMessage,
  searchPublicRecords
} from './publicSearchService';
import type { OfficialCamaraSearchClient, OfficialSenadoSearchClient } from './officialSearchService';

function createEmptySenadoClient(): OfficialSenadoSearchClient {
  return {
    getSenadoresAtuais: async () => [],
    searchMaterias: async () => []
  };
}

function createFailingSenadoClient(): OfficialSenadoSearchClient {
  return {
    getSenadoresAtuais: async () => {
      throw new SenadoApiClientError('indisponivel', {
        kind: 'network'
      });
    },
    searchMaterias: async () => {
      throw new SenadoApiClientError('indisponivel', {
        kind: 'network'
      });
    }
  };
}

describe('searchPublicRecords', () => {
  it('adapts official search results to the store search contract', async () => {
    const result = await searchPublicRecords(' Ana ', {
      camaraClient: {
        getDeputados: async () => [
          {
            id: 10,
            nome: 'Ana Costa',
            siglaPartido: 'ABC'
          }
        ],
        getProposicoes: async () => []
      },
      senadoClient: createEmptySenadoClient()
    });

    expect(result).toMatchObject({
      parliamentarians: [
        {
          id: 'camara-10',
          name: 'Ana Costa',
          party: 'ABC'
        }
      ],
      proposals: [],
      recoverableMessage: ''
    });
  });

  it('keeps a single direct official proposal available to the store', async () => {
    const result = await searchPublicRecords('PL 2630/2020', {
      camaraClient: {
        getDeputados: async () => [],
        getProposicoes: async () => [
          {
            id: 2630,
            siglaTipo: 'PL',
            numero: 2630,
            ano: 2020
          }
        ]
      },
      senadoClient: createEmptySenadoClient()
    });

    expect(result.directProposal?.id).toBe('camara-proposicao-2630');
    expect(result.recoverableMessage).toBe('');
  });

  it('exposes a specific message for malformed direct legislative identifiers', async () => {
    const result = await searchPublicRecords('PL 2630/20', {
      camaraClient: {
        getDeputados: async () => {
          throw new Error('Camara parliamentarian search should not run.');
        },
        getProposicoes: async () => {
          throw new Error('Camara proposal search should not run.');
        }
      },
      senadoClient: {
        getSenadoresAtuais: async () => {
          throw new Error('Senado parliamentarian search should not run.');
        },
        searchMaterias: async () => {
          throw new Error('Senado matter search should not run.');
        }
      }
    });

    expect(result).toEqual({
      parliamentarians: [],
      proposals: [],
      directProposal: undefined,
      recoverableMessage:
        'Identificador legislativo incompleto. Use formatos como PL 2630/2020, PL-2630 ou PEC 45.'
    });
  });

  it('keeps available official results and exposes partial source failures', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        throw new CamaraApiClientError('indisponivel', {
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

    const result = await searchPublicRecords('educacao', {
      camaraClient,
      senadoClient: createEmptySenadoClient()
    });

    expect(result.proposals.map((proposal) => proposal.id)).toEqual(['camara-proposicao-100']);
    expect(result.recoverableMessage).toBe(
      'Dados oficiais da Câmara dos Deputados vieram incompletos nesta consulta. Os resultados retornados foram exibidos.'
    );
  });

  it('exposes complete official source failures without fixture fallback', async () => {
    const camaraClient: OfficialCamaraSearchClient = {
      getDeputados: async () => {
        throw new CamaraApiClientError('indisponivel', {
          kind: 'network'
        });
      },
      getProposicoes: async () => {
        throw new CamaraApiClientError('indisponivel', {
          kind: 'network'
        });
      }
    };

    const result = await searchPublicRecords('ana', {
      camaraClient,
      senadoClient: createFailingSenadoClient()
    });

    expect(result.parliamentarians).toEqual([]);
    expect(result.proposals).toEqual([]);
    expect(result.recoverableMessage).toBe(
      'As fontes oficiais da Câmara dos Deputados e do Senado Federal não puderam ser consultadas neste momento. Tente novamente mais tarde.'
    );
  });
  it('describes malformed direct proposal searches', () => {
    expect(
      getDirectProposalSearchMessage({
        query: 'PL 2630/20',
        parliamentarians: [],
        proposals: [],
        sources: [],
        directProposalError:
          'Identificador legislativo incompleto. Use formatos como PL 2630/2020, PL-2630 ou PEC 45.',
        directProposalResolution: 'invalid'
      })
    ).toBe(
      'Identificador legislativo incompleto. Use formatos como PL 2630/2020, PL-2630 ou PEC 45.'
    );
  });
});

describe('getOfficialSearchRecoverableMessage', () => {
  it('does not add a recoverable message when all official sources are fulfilled', () => {
    expect(
      getOfficialSearchRecoverableMessage({
        query: 'ana',
        parliamentarians: [],
        proposals: [],
        sources: [
          {
            source: 'camara',
            status: 'fulfilled',
            parliamentarianCount: 0,
            proposalCount: 0,
            errors: []
          },
          {
            source: 'senado',
            status: 'fulfilled',
            parliamentarianCount: 0,
            proposalCount: 0,
            errors: []
          }
        ],
        directProposalResolution: 'not-direct-query'
      })
    ).toBe('');
  });

  it('describes ambiguous direct proposal searches without opening a detail automatically', () => {
    expect(
      getDirectProposalSearchMessage({
        query: 'PEC 45',
        parliamentarians: [],
        proposals: [],
        sources: [],
        directProposalQuery: {
          type: 'PEC',
          number: '45',
          label: 'PEC 45'
        },
        directProposalResolution: 'ambiguous'
      })
    ).toBe(
      'Mais de uma proposição oficial corresponde a PEC 45. Informe o ano ou selecione um resultado oficial exibido.'
    );
  });

  it('describes direct proposal searches without official matches', () => {
    expect(
      getDirectProposalSearchMessage({
        query: 'PLP 19/2023',
        parliamentarians: [],
        proposals: [],
        sources: [],
        directProposalQuery: {
          type: 'PLP',
          number: '19',
          year: 2023,
          label: 'PLP 19/2023'
        },
        directProposalResolution: 'not-found'
      })
    ).toBe(
      'Nenhuma proposição oficial foi encontrada para PLP 19/2023 nas fontes consultadas. Confira tipo, número e ano.'
    );
  });
});
