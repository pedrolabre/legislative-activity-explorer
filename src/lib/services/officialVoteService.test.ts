import { describe, expect, it, vi } from 'vitest';
import { CamaraApiClientError } from '$lib/api/camaraClient';
import { SenadoApiClientError } from '$lib/api/senadoClient';
import type { LegislativeProposal } from '$lib/domain';
import {
  getOfficialVotesByProposal,
  type OfficialCamaraVoteClient,
  type OfficialSenadoVoteClient
} from './officialVoteService';

function createCamaraProposal(): LegislativeProposal {
  return {
    id: 'camara-proposicao-100',
    origin: 'official',
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
    const requestedProposalVotePages: Array<{ id: string | number; options: unknown }> = [];
    const requestedVoteDetails: Array<string | number> = [];
    const requestedNominalVotes: Array<string | number> = [];
    const client: OfficialCamaraVoteClient = {
      getProposicaoVotacoesByIdPage: async (id, options) => {
        requestedProposalVotePages.push({ id, options });

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

    expect(requestedProposalVotePages).toEqual([
      {
        id: '100',
        options: {
          ordem: 'DESC',
          ordenarPor: 'dataHoraRegistro'
        }
      }
    ]);
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

  it('represents an empty official Camara vote list as fulfilled absence', async () => {
    await expect(
      getOfficialVotesByProposal(createCamaraProposal(), {
        camaraClient: createEmptyCamaraVoteClient()
      })
    ).resolves.toEqual({
      status: 'fulfilled',
      data: [],
      errors: []
    });
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
        kind: 'official-unavailable',
        status: 503
      })
    ]);
  });

  it('applies the proposal vote limit locally without sending unsupported query parameters', async () => {
    const requestedVoteDetails: Array<string | number> = [];
    const result = await getOfficialVotesByProposal(createCamaraProposal(), {
      maxVotesPerProposal: 1,
      camaraClient: {
        ...createEmptyCamaraVoteClient(),
        getProposicaoVotacoesByIdPage: async () => {
          return {
            data: [
              {
                id: '100-1',
                descricao: 'Votacao nominal.'
              },
              {
                id: '100-2',
                descricao: 'Segunda votacao nominal.'
              }
            ],
            links: [
              {
                rel: 'next',
                href: 'https://dados.example/api/v2/proposicoes/100/votacoes?pagina=2'
              }
            ]
          };
        },
        getVotacaoById: async (id) => {
          requestedVoteDetails.push(id);

          return {
            id
          };
        }
      }
    });

    expect(result.status).toBe('partial');
    expect(result.data.map((vote) => vote.id)).toEqual(['camara-votacao-100-1']);
    expect(requestedVoteDetails).toEqual(['100-1']);
    expect(result.errors).toEqual([
      {
        source: 'camara',
        entity: 'proposal-votes',
        kind: 'pagination-limit',
        message:
          'A fonte oficial retornou mais votações ou indicou paginação adicional. Limite máximo desta consulta: 1 votação por proposição. Exige backend futuro para consulta completa.'
      }
    ]);
  });

  it('represents proposal vote endpoint failures without example data fallback', async () => {
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
            'A consulta oficial de votações associadas da Câmara dos Deputados excedeu o tempo limite.'
        }
      ]
    });
  });

  it('loads Senado votes associated with an official process proposal', async () => {
    const proposal: LegislativeProposal = {
      id: 'senado-processo-7761651',
      origin: 'official',
      source: 'senado',
      sourceId: '7761651',
      title: 'PEC 91/2019',
      type: 'PEC',
      number: '91',
      year: 2019,
      references: []
    };
    const requestedOptions: unknown[] = [];
    const senadoClient: OfficialSenadoVoteClient = {
      getVotacoes: async (options) => {
        requestedOptions.push(options);

        return [
          {
            codigoSessaoVotacao: 5969,
            dataSessao: '2019-06-12',
            identificacao: 'PEC 91/2019',
            descricaoVotacao: 'Proposta de Emenda a Constituicao n. 91, de 2019.',
            resultadoVotacao: 'A',
            votos: [
              {
                codigoParlamentar: 825,
                nomeParlamentar: 'Paulo Paim',
                siglaPartidoParlamentar: 'PT',
                siglaUFParlamentar: 'RS',
                siglaVotoParlamentar: 'Sim'
              }
            ]
          }
        ];
      }
    };

    const result = await getOfficialVotesByProposal(proposal, {
      camaraClient: createEmptyCamaraVoteClient(),
      senadoClient
    });

    expect(requestedOptions).toEqual([
      {
        idProcesso: '7761651'
      }
    ]);
    expect(result).toEqual({
      status: 'fulfilled',
      errors: [],
      data: [
        {
          id: 'senado-votacao-5969',
          source: 'senado',
          sourceId: '5969',
          proposalId: 'PEC 91/2019',
          votedAt: '2019-06-12',
          description: 'Proposta de Emenda a Constituicao n. 91, de 2019.',
          result: 'A',
          individualVotes: [
            {
              parliamentarianId: 'senado-825',
              parliamentarianName: 'Paulo Paim',
              party: 'PT',
              state: 'RS',
              vote: 'SIM'
            }
          ]
        }
      ]
    });
  });

  it('loads Senado votes by legacy matter code when the selected proposal is a matter', async () => {
    const proposal: LegislativeProposal = {
      id: 'senado-materia-137178',
      origin: 'official',
      source: 'senado',
      sourceId: '137178',
      title: 'PEC 91/2019',
      type: 'PEC',
      references: []
    };
    const requestedOptions: unknown[] = [];

    await getOfficialVotesByProposal(proposal, {
      camaraClient: createEmptyCamaraVoteClient(),
      senadoClient: {
        getVotacoes: async (options) => {
          requestedOptions.push(options);

          return [];
        }
      }
    });

    expect(requestedOptions).toEqual([
      {
        codigoMateria: '137178'
      }
    ]);
  });

  it('represents Senado vote endpoint failures without example data fallback', async () => {
    const proposal: LegislativeProposal = {
      id: 'senado-processo-7761651',
      origin: 'official',
      source: 'senado',
      sourceId: '7761651',
      title: 'PEC 91/2019',
      type: 'PEC',
      references: []
    };

    await expect(
      getOfficialVotesByProposal(proposal, {
        camaraClient: createEmptyCamaraVoteClient(),
        senadoClient: {
          getVotacoes: async () => {
            throw new SenadoApiClientError('A API do Senado retornou uma falha HTTP.', {
              kind: 'http',
              status: 503
            });
          }
        }
      })
    ).resolves.toEqual({
      status: 'failed',
      data: [],
      errors: [
        {
          source: 'senado',
          entity: 'proposal-votes',
          kind: 'official-unavailable',
          message:
            'A fonte oficial do Senado Federal informou indisponibilidade temporária. A consulta pode ser repetida mais tarde.',
          status: 503
        }
      ]
    });
  });

  it('applies a local Senado vote limit without sending unsupported pagination parameters', async () => {
    const proposal: LegislativeProposal = {
      id: 'senado-processo-7761651',
      origin: 'official',
      source: 'senado',
      sourceId: '7761651',
      title: 'PEC 91/2019',
      type: 'PEC',
      references: []
    };

    const result = await getOfficialVotesByProposal(proposal, {
      camaraClient: createEmptyCamaraVoteClient(),
      senadoClient: {
        getVotacoes: async () => [
          {
            codigoSessaoVotacao: 5969,
            descricaoVotacao: 'Primeira votacao.'
          },
          {
            codigoSessaoVotacao: 5970,
            descricaoVotacao: 'Segunda votacao.'
          }
        ]
      },
      maxVotesPerProposal: 1
    });

    expect(result.status).toBe('partial');
    expect(result.data.map((vote) => vote.id)).toEqual(['senado-votacao-5969']);
    expect(result.errors).toEqual([
      {
        source: 'senado',
        entity: 'proposal-votes',
        kind: 'pagination-limit',
        message:
          'A fonte oficial do Senado retornou mais votações do que o limite local desta consulta. Limite máximo: 1 votação por proposição. Exige backend futuro para consulta completa.'
      }
    ]);
  });
});
