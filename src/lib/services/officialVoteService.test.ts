import { describe, expect, it, vi } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import type { LegislativeProposal } from '$lib/domain';
import {
  getOfficialVotesByProposal,
  type OfficialCamaraVoteClient
} from './officialVoteService';

function createCamaraProposal(): LegislativeProposal {
  return {
    id: 'camara-proposicao-100',
    source: 'camara',
    sourceId: '100',
    title: 'PL 2/2024',
    type: 'PL',
    references: []
  };
}

function createEmptyCamaraVoteClient(): OfficialCamaraVoteClient {
  return {
    getProposicaoVotacoesByIdPage: async () => ({
      data: [],
      links: []
    }),
    getVotacaoById: async (id) => ({
      id
    }),
    getVotacaoVotosById: async () => []
  };
}

describe('getOfficialVotesByProposal', () => {
  it('loads Camara votes associated with an official proposal and maps nominal votes', async () => {
    const requestedProposalIds: Array<string | number> = [];
    const requestedVoteDetails: Array<string | number> = [];
    const requestedNominalVotes: Array<string | number> = [];
    const client: OfficialCamaraVoteClient = {
      getProposicaoVotacoesByIdPage: async (id, options) => {
        requestedProposalIds.push(id);

        expect(options).toEqual({
          pagina: 1,
          itens: 50
        });

        return {
          data: [
            {
              id: '100-1',
              data: '2024-06-12',
              descricao: 'Votacao nominal do texto-base.'
            }
          ],
          links: []
        };
      },
      getVotacaoById: async (id) => {
        requestedVoteDetails.push(id);

        return {
          id,
          data: '2024-06-13',
          descricao: 'Detalhe oficial da votacao.',
          resultado: 'Aprovado'
        };
      },
      getVotacaoVotosById: async (id) => {
        requestedNominalVotes.push(id);

        return [
          {
            tipoVoto: 'Sim',
            deputado_: {
              id: 10,
              nome: 'Ana Costa',
              siglaPartido: 'ABC',
              siglaUf: 'MG'
            }
          },
          {
            tipoVoto: 'Nao',
            deputado_: {
              id: 11,
              nome: 'Bruno Ribeiro',
              siglaPartido: 'XYZ',
              siglaUf: 'SP'
            }
          }
        ];
      }
    };

    const result = await getOfficialVotesByProposal(createCamaraProposal(), {
      camaraClient: client
    });

    expect(requestedProposalIds).toEqual(['100']);
    expect(requestedVoteDetails).toEqual(['100-1']);
    expect(requestedNominalVotes).toEqual(['100-1']);
    expect(result).toEqual({
      status: 'fulfilled',
      errors: [],
      data: [
        {
          id: 'camara-votacao-100-1',
          source: 'camara',
          sourceId: '100-1',
          proposalId: 'PL 2/2024',
          votedAt: '2024-06-13',
          description: 'Detalhe oficial da votacao.',
          result: 'Aprovado',
          individualVotes: [
            {
              parliamentarianId: 'camara-10',
              parliamentarianName: 'Ana Costa',
              party: 'ABC',
              state: 'MG',
              vote: 'SIM'
            },
            {
              parliamentarianId: 'camara-11',
              parliamentarianName: 'Bruno Ribeiro',
              party: 'XYZ',
              state: 'SP',
              vote: 'NAO'
            }
          ]
        }
      ]
    });
    expect(result.data[0].counts).toBeUndefined();
  });

  it('keeps vote data available when the nominal list fails', async () => {
    const result = await getOfficialVotesByProposal(createCamaraProposal(), {
      camaraClient: {
        ...createEmptyCamaraVoteClient(),
        getProposicaoVotacoesByIdPage: async () => ({
          data: [
            {
              id: '100-1',
              data: '2024-06-12',
              descricao: 'Votacao nominal.'
            }
          ],
          links: []
        }),
        getVotacaoVotosById: async () => {
          throw new CamaraApiClientError('A API da Camara retornou uma falha HTTP.', {
            kind: 'http',
            status: 503
          });
        }
      }
    });

    expect(result.status).toBe('partial');
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'camara-votacao-100-1',
        individualVotes: []
      })
    ]);
    expect(result.errors).toEqual([
      expect.objectContaining({
        source: 'camara',
        entity: 'individual-votes',
        kind: 'client'
      })
    ]);
  });

  it('reports pagination as partial without following broad result pages', async () => {
    const result = await getOfficialVotesByProposal(createCamaraProposal(), {
      maxVotesPerProposal: 1,
      camaraClient: {
        ...createEmptyCamaraVoteClient(),
        getProposicaoVotacoesByIdPage: async (_id, options) => {
          expect(options).toEqual({
            pagina: 1,
            itens: 1
          });

          return {
            data: [
              {
                id: '100-1',
                descricao: 'Votacao nominal.'
              }
            ],
            links: [
              {
                rel: 'next',
                href: 'https://dados.example/api/v2/proposicoes/100/votacoes?pagina=2'
              }
            ]
          };
        }
      }
    });

    expect(result.status).toBe('partial');
    expect(result.data.map((vote) => vote.id)).toEqual(['camara-votacao-100-1']);
    expect(result.errors).toEqual([
      {
        source: 'camara',
        entity: 'proposal-votes',
        kind: 'pagination-limit',
        message:
          'A fonte oficial indicou mais votacoes para esta proposicao; esta versao consulta apenas a primeira pagina retornada.'
      }
    ]);
  });

  it('represents proposal vote endpoint failures without fixture fallback', async () => {
    const detailLoader = vi.fn();
    const nominalLoader = vi.fn();
    const result = await getOfficialVotesByProposal(createCamaraProposal(), {
      camaraClient: {
        getProposicaoVotacoesByIdPage: async () => {
          throw new CamaraApiClientError('timeout', {
            kind: 'timeout'
          });
        },
        getVotacaoById: detailLoader,
        getVotacaoVotosById: nominalLoader
      }
    });

    expect(detailLoader).not.toHaveBeenCalled();
    expect(nominalLoader).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'failed',
      data: [],
      errors: [
        {
          source: 'camara',
          entity: 'proposal-votes',
          kind: 'timeout',
          message:
            'A consulta oficial de votacoes associadas da Camara dos Deputados excedeu o tempo limite.'
        }
      ]
    });
  });

  it('keeps Senado votes unavailable in this Camara block', async () => {
    const proposal: LegislativeProposal = {
      id: 'senado-materia-300',
      source: 'senado',
      sourceId: '300',
      title: 'PLS 3/2024',
      type: 'PLS',
      references: []
    };
    const client = {
      ...createEmptyCamaraVoteClient(),
      getProposicaoVotacoesByIdPage: vi.fn()
    };

    await expect(
      getOfficialVotesByProposal(proposal, {
        camaraClient: client
      })
    ).resolves.toEqual({
      status: 'unavailable',
      data: [],
      errors: []
    });
    expect(client.getProposicaoVotacoesByIdPage).not.toHaveBeenCalled();
  });
});
