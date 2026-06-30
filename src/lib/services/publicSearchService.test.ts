import { describe, expect, it } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import { SenadoApiClientError } from '$lib/api/senadoClient';
import {
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
      'Parte dos dados oficiais da Câmara dos Deputados não pôde ser exibida nesta consulta. Os resultados disponíveis foram exibidos.'
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
        ]
      })
    ).toBe('');
  });
});
