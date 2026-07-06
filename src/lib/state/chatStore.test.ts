import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { RollCallVote } from '$lib/domain';
import { searchPublicRecords } from '$lib/services/publicSearchService';
import { searchInitialRecords } from '$lib/services/searchService';
import {
  chatStore,
  executeSearch,
  goBack,
  initialChatContext,
  navigateTo,
  officialParliamentarianVoteHistoryUnavailableMessage,
  officialSenadoAssociatedMattersUnavailableMessage,
  officialSenadoProposalVotesUnavailableMessage,
  openParliamentarianBills,
  openParliamentarianVotes,
  reset,
  selectParliamentarianById,
  selectProposalById,
  selectVoteById
} from './chatStore';

vi.mock('$lib/services/publicSearchService', () => ({
  searchPublicRecords: vi.fn()
}));

const mockedSearchPublicRecords = vi.mocked(searchPublicRecords);

function executeFixtureSearch(query: string) {
  return executeSearch(query, {
    delayMs: 0,
    search: searchInitialRecords
  });
}

function createControlledVote(id = 'controlled-vote'): RollCallVote {
  return {
    id,
    source: 'camara',
    sourceId: id,
    proposalId: 'PL 9/2026',
    description: 'Votacao controlada para teste.',
    individualVotes: []
  };
}

describe('chatStore actions', () => {
  beforeEach(() => {
    mockedSearchPublicRecords.mockReset();
    mockedSearchPublicRecords.mockResolvedValue({
      parliamentarians: [],
      proposals: []
    });
    reset();
  });

  afterEach(() => {
    reset();
  });

  it('starts with a welcome context in memory', () => {
    expect(get(chatStore)).toEqual(initialChatContext);
  });

  it('navigates to a new state and returns through the history stack', () => {
    navigateTo('ABOUT');

    expect(get(chatStore).currentState).toBe('ABOUT');
    expect(get(chatStore).historyStack).toEqual(['WELCOME']);

    goBack();

    expect(get(chatStore).currentState).toBe('WELCOME');
    expect(get(chatStore).historyStack).toEqual([]);
  });

  it('ignores an empty search term', async () => {
    await executeSearch('   ', { delayMs: 0 });

    expect(get(chatStore)).toEqual(initialChatContext);
  });

  it('uses public official search as the runtime default', async () => {
    mockedSearchPublicRecords.mockResolvedValueOnce({
      parliamentarians: [
        {
          id: 'camara-10',
          source: 'camara',
          sourceId: '10',
          name: 'Ana Costa',
          office: 'Deputado federal'
        }
      ],
      proposals: [],
      recoverableMessage: 'Parte das fontes oficiais não respondeu nesta consulta.'
    });

    await executeSearch(' ana ', { delayMs: 0 });

    expect(mockedSearchPublicRecords).toHaveBeenCalledWith('ana');
    expect(get(chatStore)).toMatchObject({
      currentState: 'SEARCH_RESULTS',
      lastQuery: 'ana',
      parliamentariansFound: [
        {
          id: 'camara-10',
          name: 'Ana Costa'
        }
      ],
      proposalsFound: [],
      errorMessage: 'Parte das fontes oficiais não respondeu nesta consulta.'
    });
  });

  it('routes a search with no matches to an empty result state', async () => {
    await executeFixtureSearch('termo sem fixture');

    expect(get(chatStore)).toMatchObject({
      currentState: 'SEARCH_RESULTS',
      historyStack: [],
      lastQuery: 'termo sem fixture',
      parliamentariansFound: [],
      proposalsFound: [],
      selectedParliamentarian: null,
      parliamentarianProposals: [],
      selectedProposal: null,
      selectedVote: null,
      voteHistory: [],
      errorMessage: ''
    });
  });

  it('routes a shared term search to multiple result groups', async () => {
    await executeFixtureSearch('educacao');

    const context = get(chatStore);

    expect(context.currentState).toBe('SEARCH_RESULTS');
    expect(context.lastQuery).toBe('educacao');
    expect(context.parliamentariansFound.map((parliamentarian) => parliamentarian.name)).toEqual([
      'Ana Costa'
    ]);
    expect(context.proposalsFound.map((proposal) => proposal.title)).toEqual(['PL 1234/2024']);
    expect(context.selectedParliamentarian).toBeNull();
    expect(context.selectedProposal).toBeNull();
    expect(context.selectedVote).toBeNull();
  });

  it('routes a parliamentarian search without persistence', async () => {
    await executeFixtureSearch('ana');

    const context = get(chatStore);

    expect(context.currentState).toBe('SEARCH_RESULTS');
    expect(context.lastQuery).toBe('ana');
    expect(context.parliamentariansFound.map((parliamentarian) => parliamentarian.name)).toEqual([
      'Ana Costa'
    ]);
    expect(context.proposalsFound).toEqual([]);
    expect(context.selectedParliamentarian).toBeNull();
  });

  it('routes a proposal search without selecting a proposal automatically', async () => {
    await executeFixtureSearch('PEC 45');

    const context = get(chatStore);

    expect(context.currentState).toBe('SEARCH_RESULTS');
    expect(context.lastQuery).toBe('PEC 45');
    expect(context.parliamentariansFound).toEqual([]);
    expect(context.proposalsFound.map((proposal) => proposal.title)).toEqual(['PEC 45/2023']);
    expect(context.selectedProposal).toBeNull();
  });

  it('opens a single direct official proposal search immediately without a parliamentarian', async () => {
    const directProposal = {
      id: 'camara-proposicao-2630',
      source: 'camara' as const,
      sourceId: '2630',
      title: 'PL 2630/2020',
      type: 'PL',
      number: '2630',
      year: 2020,
      officialSummary: 'Ementa oficial retornada pela busca.',
      references: []
    };
    const officialVote: RollCallVote = {
      id: 'camara-votacao-2630-1',
      source: 'camara',
      sourceId: '2630-1',
      proposalId: 'PL 2630/2020',
      description: 'Votacao oficial controlada.',
      individualVotes: []
    };
    const officialVotesLoader = vi.fn(async () => ({
      status: 'fulfilled' as const,
      data: [officialVote],
      errors: []
    }));

    await executeSearch('PL 2630/2020', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [],
        proposals: [directProposal],
        directProposal
      }),
      getOfficialProposalDetail: async (proposal) => ({
        status: 'fulfilled',
        data: {
          ...proposal,
          officialSummary: 'Detalhe oficial controlado da proposição.'
        },
        errors: []
      }),
      getOfficialVotesByProposal: officialVotesLoader
    });

    expect(officialVotesLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'camara-proposicao-2630',
        officialSummary: expect.stringContaining('Detalhe oficial controlado')
      })
    );
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_DETAIL',
      historyStack: [],
      lastQuery: 'PL 2630/2020',
      parliamentariansFound: [],
      proposalsFound: [
        {
          id: 'camara-proposicao-2630'
        }
      ],
      selectedParliamentarian: null,
      selectedProposal: {
        id: 'camara-proposicao-2630',
        officialSummary: expect.stringContaining('Detalhe oficial controlado')
      },
      voteHistory: [
        {
          id: 'camara-votacao-2630-1',
          proposalId: 'PL 2630/2020'
        }
      ],
      errorMessage: ''
    });

    expect(selectVoteById('camara-votacao-2630-1')).toBe(true);
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_VOTES',
      selectedParliamentarian: null,
      selectedProposal: {
        id: 'camara-proposicao-2630'
      },
      selectedVote: {
        id: 'camara-votacao-2630-1'
      }
    });
  });

  it('opens a single direct official Senado process search immediately without a parliamentarian', async () => {
    const directProposal = {
      id: 'senado-processo-9046221',
      source: 'senado' as const,
      sourceId: '9046221',
      title: 'RQS 368/2026',
      type: 'RQS',
      number: '368',
      year: 2026,
      officialSummary: 'Ementa oficial retornada pela busca.',
      references: []
    };

    await executeSearch('RQS 368/2026', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [],
        proposals: [directProposal],
        directProposal
      }),
      getOfficialProposalDetail: async (proposal) => ({
        status: 'fulfilled',
        data: {
          ...proposal,
          officialSummary: 'Detalhe moderno oficial da matÃ©ria.'
        },
        errors: []
      })
    });

    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_DETAIL',
      historyStack: [],
      lastQuery: 'RQS 368/2026',
      parliamentariansFound: [],
      proposalsFound: [
        {
          id: 'senado-processo-9046221'
        }
      ],
      selectedParliamentarian: null,
      selectedProposal: {
        id: 'senado-processo-9046221',
        officialSummary: 'Detalhe moderno oficial da matÃ©ria.'
      },
      voteHistory: [],
      errorMessage: ''
    });
  });

  it('opens an official proposal result manually without selecting a parliamentarian', async () => {
    await executeSearch('PEC 45', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [],
        proposals: [
          {
            id: 'camara-proposicao-451',
            source: 'camara',
            sourceId: '451',
            title: 'PEC 45/2019',
            type: 'PEC',
            number: '45',
            year: 2019,
            references: []
          }
        ],
        recoverableMessage:
          'Mais de uma proposição oficial corresponde a PEC 45. Informe o ano ou selecione um resultado oficial exibido.'
      })
    });

    const officialVotesLoader = vi.fn(async () => ({
      status: 'fulfilled' as const,
      data: [],
      errors: []
    }));

    await expect(
      selectProposalById('camara-proposicao-451', {
        getOfficialProposalDetail: async (proposal) => ({
          status: 'fulfilled',
          data: {
            ...proposal,
            officialSummary: 'Detalhe oficial da PEC controlada.'
          },
          errors: []
        }),
        getOfficialVotesByProposal: officialVotesLoader
      })
    ).resolves.toBe(true);

    expect(officialVotesLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'camara-proposicao-451',
        officialSummary: 'Detalhe oficial da PEC controlada.'
      })
    );
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_DETAIL',
      historyStack: ['SEARCH_RESULTS'],
      selectedParliamentarian: null,
      selectedProposal: {
        id: 'camara-proposicao-451',
        officialSummary: 'Detalhe oficial da PEC controlada.'
      },
      voteHistory: [],
      errorMessage: ''
    });
  });

  it('resets search results and selections to a new initial context', async () => {
    await executeFixtureSearch('ana');
    await selectParliamentarianById('parliamentarian-ana-costa');
    await openParliamentarianBills();
    await selectProposalById('bill-pl-1234-2024');

    reset();

    const context = get(chatStore);

    expect(context).toEqual(initialChatContext);
    expect(context).not.toBe(initialChatContext);
  });

  it('records a neutral recoverable error when search execution fails', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => {
        throw new Error('controlled failure');
      }
    });

    const errorContext = get(chatStore);

    expect(errorContext.currentState).toBe('ERROR');
    expect(errorContext.errorMessage).toContain('concluir a busca');

    reset();

    expect(get(chatStore)).toEqual(initialChatContext);
  });

  it('selects a parliamentarian and a proposal through guided actions', async () => {
    await executeFixtureSearch('ana');

    await expect(selectParliamentarianById('parliamentarian-ana-costa')).resolves.toBe(true);

    const parliamentarianContext = get(chatStore);

    expect(parliamentarianContext.currentState).toBe('PARLIAMENTARIAN_DETAIL');
    expect(parliamentarianContext.selectedParliamentarian).toMatchObject({
      id: 'parliamentarian-ana-costa',
      name: 'Ana Costa'
    });
    expect(parliamentarianContext.parliamentarianProposals).toEqual([]);
    expect(parliamentarianContext.selectedProposal).toBeNull();
    expect(parliamentarianContext.selectedVote).toBeNull();
    expect(parliamentarianContext.voteHistory).toEqual([]);

    await expect(openParliamentarianBills()).resolves.toBe(true);

    const billsContext = get(chatStore);

    expect(billsContext.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(billsContext.parliamentarianProposals.map((proposal) => proposal.title)).toEqual([
      'PL 220/2025',
      'PL 1234/2024'
    ]);
    expect(billsContext.selectedProposal).toBeNull();
    expect(billsContext.selectedVote).toBeNull();

    await expect(selectProposalById('bill-pl-1234-2024')).resolves.toBe(true);

    const proposalContext = get(chatStore);

    expect(proposalContext.currentState).toBe('BILL_DETAIL');
    expect(proposalContext.selectedParliamentarian?.name).toBe('Ana Costa');
    expect(proposalContext.selectedProposal?.title).toBe('PL 1234/2024');
    expect(proposalContext.selectedVote).toBeNull();
  });

  it('returns through the deterministic history stack', async () => {
    await executeFixtureSearch('ana');

    await selectParliamentarianById('parliamentarian-ana-costa');
    await openParliamentarianBills();
    await selectProposalById('bill-pl-1234-2024');

    expect(get(chatStore).historyStack).toEqual([
      'SEARCH_RESULTS',
      'PARLIAMENTARIAN_DETAIL',
      'PARLIAMENTARIAN_BILLS'
    ]);

    goBack();

    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_BILLS',
      historyStack: ['SEARCH_RESULTS', 'PARLIAMENTARIAN_DETAIL']
    });

    goBack();

    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_DETAIL',
      historyStack: ['SEARCH_RESULTS']
    });

    goBack();

    expect(get(chatStore)).toMatchObject({
      currentState: 'SEARCH_RESULTS',
      historyStack: []
    });
  });

  it('selects an official parliamentarian result and loads controlled official detail', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: async () => ({
        parliamentarians: [
          {
            id: 'camara-10',
            source: 'camara',
            sourceId: '10',
            name: 'Ana Costa',
            office: 'Deputado federal',
            party: 'ABC'
          }
        ],
        proposals: []
      })
    });

    const fixtureParliamentarianLoader = vi.fn();

    await expect(
      selectParliamentarianById('camara-10', {
        getFixtureParliamentarianById: fixtureParliamentarianLoader,
        getOfficialParliamentarianDetail: async (parliamentarian) => ({
          status: 'fulfilled',
          data: {
            id: parliamentarian.id,
            source: parliamentarian.source,
            sourceId: parliamentarian.sourceId,
            name: parliamentarian.name,
            office: parliamentarian.office,
            fullName: 'Ana Costa Pereira',
            state: 'MG',
            email: 'dep.ana@camara.leg.br'
          },
          errors: []
        })
      })
    ).resolves.toBe(true);

    expect(fixtureParliamentarianLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_DETAIL',
      selectedParliamentarian: {
        id: 'camara-10',
        fullName: 'Ana Costa Pereira',
        party: 'ABC',
        state: 'MG',
        email: 'dep.ana@camara.leg.br'
      },
      parliamentarianProposals: [],
      errorMessage: ''
    });
  });

  it('keeps an official search result as partial detail when official detail is unavailable', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'senado-20',
            source: 'senado',
            sourceId: '20',
            name: 'Maria Souza',
            office: 'Senador'
          }
        ],
        proposals: []
      })
    });

    const fixtureParliamentarianLoader = vi.fn();

    await expect(
      selectParliamentarianById('senado-20', {
        getFixtureParliamentarianById: fixtureParliamentarianLoader,
        getOfficialParliamentarianDetail: async () => ({
          status: 'failed',
          data: null,
          errors: [
            {
              source: 'senado',
              entity: 'parliamentarian',
              kind: 'client',
              message: 'Falha controlada.'
            }
          ]
        })
      })
    ).resolves.toBe(true);

    expect(fixtureParliamentarianLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_DETAIL',
      selectedParliamentarian: {
        id: 'senado-20',
        name: 'Maria Souza'
      },
      errorMessage: 'Dados oficiais de parlamentar não puderam ser carregados neste momento.'
    });
  });

  it('opens controlled official proposals and loads official proposal detail', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'camara-10',
            source: 'camara',
            sourceId: '10',
            name: 'Ana Costa',
            office: 'Deputado federal'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('camara-10', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });

    const fixtureProposalsLoader = vi.fn();

    await expect(
      openParliamentarianBills({
        getFixtureProposalsByParliamentarianId: fixtureProposalsLoader,
        getOfficialProposalsByParliamentarian: async () => ({
          status: 'fulfilled',
          data: [
            {
              id: 'camara-proposicao-100',
              source: 'camara',
              sourceId: '100',
              title: 'PL 2/2024',
              type: 'PL',
              number: '2',
              year: 2024,
              relationship: 'Autoria',
              references: []
            }
          ],
          errors: []
        })
      })
    ).resolves.toBe(true);

    expect(fixtureProposalsLoader).not.toHaveBeenCalled();

    const fixtureProposalLoader = vi.fn();
    const officialVote: RollCallVote = {
      id: 'camara-votacao-100-1',
      source: 'camara',
      sourceId: '100-1',
      proposalId: 'PL 2/2024',
      votedAt: '2024-06-12',
      description: 'Votacao nominal oficial.',
      individualVotes: [
        {
          parliamentarianId: 'camara-10',
          parliamentarianName: 'Ana Costa',
          party: 'ABC',
          state: 'MG',
          vote: 'SIM'
        }
      ]
    };
    const officialVotesLoader = vi.fn(async () => ({
      status: 'fulfilled' as const,
      data: [officialVote],
      errors: []
    }));

    await expect(
      selectProposalById('camara-proposicao-100', {
        getFixtureProposalByIdForParliamentarian: fixtureProposalLoader,
        getOfficialProposalDetail: async (proposal) => ({
          status: 'fulfilled',
          data: {
            id: proposal.id,
            source: proposal.source,
            sourceId: proposal.sourceId,
            title: proposal.title,
            type: proposal.type,
            references: proposal.references,
            officialSummary: 'Detalhe oficial controlado.'
          },
          errors: []
        }),
        getOfficialVotesByProposal: officialVotesLoader
      })
    ).resolves.toBe(true);

    expect(fixtureProposalLoader).not.toHaveBeenCalled();
    expect(officialVotesLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'camara-proposicao-100',
        officialSummary: 'Detalhe oficial controlado.'
      })
    );
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_DETAIL',
      selectedProposal: {
        id: 'camara-proposicao-100',
        relationship: 'Autoria',
        officialSummary: 'Detalhe oficial controlado.'
      },
      voteHistory: [
        {
          id: 'camara-votacao-100-1',
          proposalId: 'PL 2/2024'
        }
      ],
      errorMessage: ''
    });

    const fixtureVoteDetailLoader = vi.fn(() => createControlledVote('fixture-vote-detail'));

    expect(
      selectVoteById('camara-votacao-100-1', {
        getFixtureVoteByIdForParliamentarian: fixtureVoteDetailLoader
      })
    ).toBe(true);
    expect(fixtureVoteDetailLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_VOTES',
      selectedProposal: {
        id: 'camara-proposicao-100'
      },
      selectedVote: {
        id: 'camara-votacao-100-1'
      }
    });
  });

  it('keeps an official associated proposal as partial detail when official detail fails', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'camara-10',
            source: 'camara',
            sourceId: '10',
            name: 'Ana Costa',
            office: 'Deputado federal'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('camara-10', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });
    await openParliamentarianBills({
      getOfficialProposalsByParliamentarian: async () => ({
        status: 'fulfilled',
        data: [
          {
            id: 'camara-proposicao-100',
            source: 'camara',
            sourceId: '100',
            title: 'PL 2/2024',
            type: 'PL',
            number: '2',
            year: 2024,
            subject: 'Transparencia publica',
            status: 'Em tramitacao',
            relationship: 'Autoria',
            officialSummary: 'Ementa parcial vinda da lista oficial.',
            references: []
          }
        ],
        errors: []
      })
    });

    const fixtureProposalLoader = vi.fn();
    const officialVotesLoader = vi.fn(async () => ({
      status: 'fulfilled' as const,
      data: [],
      errors: []
    }));

    await expect(
      selectProposalById('camara-proposicao-100', {
        getFixtureProposalByIdForParliamentarian: fixtureProposalLoader,
        getOfficialProposalDetail: async () => ({
          status: 'failed',
          data: null,
          errors: [
            {
              source: 'camara',
              entity: 'proposal',
              kind: 'client',
              message: 'Falha controlada.'
            }
          ]
        }),
        getOfficialVotesByProposal: officialVotesLoader
      })
    ).resolves.toBe(true);

    expect(fixtureProposalLoader).not.toHaveBeenCalled();
    expect(officialVotesLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'camara-proposicao-100'
      })
    );
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_DETAIL',
      selectedProposal: {
        id: 'camara-proposicao-100',
        subject: 'Transparencia publica',
        status: 'Em tramitacao',
        relationship: 'Autoria',
        officialSummary: 'Ementa parcial vinda da lista oficial.'
      },
      errorMessage: 'Dados oficiais de proposição não puderam ser carregados neste momento.'
    });
  });

  it('represents official votes as unavailable without loading fixture votes', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'camara-10',
            source: 'camara',
            sourceId: '10',
            name: 'Ana Costa',
            office: 'Deputado federal'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('camara-10', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });

    const fixtureVotesLoader = vi.fn(() => [createControlledVote('fixture-vote-for-official')]);

    expect(
      openParliamentarianVotes({
        getFixtureVotesByParliamentarianId: fixtureVotesLoader
      })
    ).toBe(true);
    expect(fixtureVotesLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      voteHistory: [],
      errorMessage: officialParliamentarianVoteHistoryUnavailableMessage
    });

    const fixtureVoteDetailLoader = vi.fn(() => createControlledVote('fixture-vote-detail'));

    expect(
      selectVoteById('fixture-vote-detail', {
        getFixtureVoteByIdForParliamentarian: fixtureVoteDetailLoader
      })
    ).toBe(false);
    expect(fixtureVoteDetailLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      selectedVote: null
    });
  });

  it('uses official votes already loaded from opened proposals as session partial coverage', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'camara-10',
            source: 'camara',
            sourceId: '10',
            name: 'Ana Costa',
            office: 'Deputado federal'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('camara-10', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });
    await openParliamentarianBills({
      getOfficialProposalsByParliamentarian: async () => ({
        status: 'fulfilled',
        data: [
          {
            id: 'camara-proposicao-100',
            source: 'camara',
            sourceId: '100',
            title: 'PL 2/2024',
            type: 'PL',
            relationship: 'Autoria',
            references: []
          }
        ],
        errors: []
      })
    });

    const officialVote: RollCallVote = {
      id: 'camara-votacao-100-1',
      source: 'camara',
      sourceId: '100-1',
      proposalId: 'PL 2/2024',
      votedAt: '2024-06-12',
      description: 'Votacao nominal oficial.',
      individualVotes: [
        {
          parliamentarianId: 'camara-10',
          parliamentarianName: 'Ana Costa',
          party: 'ABC',
          state: 'MG',
          vote: 'SIM'
        }
      ]
    };

    await selectProposalById('camara-proposicao-100', {
      getOfficialProposalDetail: async (proposal) => ({
        status: 'fulfilled',
        data: proposal,
        errors: []
      }),
      getOfficialVotesByProposal: async () => ({
        status: 'fulfilled',
        data: [officialVote],
        errors: []
      })
    });
    navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });

    const fixtureVotesLoader = vi.fn(() => [createControlledVote('fixture-vote-for-official')]);

    expect(
      openParliamentarianVotes({
        getFixtureVotesByParliamentarianId: fixtureVotesLoader
      })
    ).toBe(true);
    expect(fixtureVotesLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      selectedProposal: null,
      voteHistory: [
        {
          id: 'camara-votacao-100-1',
          proposalId: 'PL 2/2024'
        }
      ],
      errorMessage: officialParliamentarianVoteHistoryUnavailableMessage
    });

    const fixtureVoteDetailLoader = vi.fn(() => createControlledVote('unused-fixture-detail'));

    expect(
      selectVoteById('camara-votacao-100-1', {
        getFixtureVoteByIdForParliamentarian: fixtureVoteDetailLoader
      })
    ).toBe(true);
    expect(fixtureVoteDetailLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_VOTES',
      selectedVote: {
        id: 'camara-votacao-100-1'
      }
    });
  });

  it('represents official Senado votes as unavailable without loading fixture votes', async () => {
    await executeSearch('maria', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'senado-20',
            source: 'senado',
            sourceId: '20',
            name: 'Maria Souza',
            office: 'Senador'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('senado-20', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });

    const fixtureVotesLoader = vi.fn(() => [createControlledVote('fixture-senado-vote')]);

    expect(
      openParliamentarianVotes({
        getFixtureVotesByParliamentarianId: fixtureVotesLoader
      })
    ).toBe(true);
    expect(fixtureVotesLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      voteHistory: [],
      errorMessage: officialSenadoProposalVotesUnavailableMessage
    });

    const fixtureVoteDetailLoader = vi.fn(() => createControlledVote('fixture-senado-detail'));

    expect(
      selectVoteById('fixture-senado-detail', {
        getFixtureVoteByIdForParliamentarian: fixtureVoteDetailLoader
      })
    ).toBe(false);
    expect(fixtureVoteDetailLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      selectedVote: null
    });
  });

  it('records a neutral notice for partial official associated proposals', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'camara-10',
            source: 'camara',
            sourceId: '10',
            name: 'Ana Costa',
            office: 'Deputado federal'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('camara-10', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });

    const fixtureProposalsLoader = vi.fn();

    await expect(
      openParliamentarianBills({
        getFixtureProposalsByParliamentarianId: fixtureProposalsLoader,
        getOfficialProposalsByParliamentarian: async () => ({
          status: 'partial',
          data: [
            {
              id: 'camara-proposicao-100',
              source: 'camara',
              sourceId: '100',
              title: 'PL 2/2024',
              type: 'PL',
              references: []
            }
          ],
          errors: [
            {
              source: 'camara',
              entity: 'parliamentarian-proposals',
              kind: 'mapper',
              message:
                'Dados oficiais de proposições associadas vieram incompletos nesta consulta.'
            }
          ]
        })
      })
    ).resolves.toBe(true);

    expect(fixtureProposalsLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_BILLS',
      parliamentarianProposals: [
        {
          id: 'camara-proposicao-100',
          title: 'PL 2/2024'
        }
      ],
      errorMessage:
        'Dados oficiais de proposições associadas vieram incompletos nesta consulta.'
    });
  });

  it('does not load fixture proposals when official associated proposals fail', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'camara-10',
            source: 'camara',
            sourceId: '10',
            name: 'Ana Costa',
            office: 'Deputado federal'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('camara-10', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });

    const fixtureProposalsLoader = vi.fn();

    await expect(
      openParliamentarianBills({
        getFixtureProposalsByParliamentarianId: fixtureProposalsLoader,
        getOfficialProposalsByParliamentarian: async () => ({
          status: 'failed',
          data: [],
          errors: [
            {
              source: 'camara',
              entity: 'parliamentarian-proposals',
              kind: 'client',
              message: 'Falha oficial controlada.'
            }
          ]
        })
      })
    ).resolves.toBe(true);

    expect(fixtureProposalsLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_BILLS',
      parliamentarianProposals: [],
      errorMessage:
        'Dados oficiais de proposições associadas não puderam ser carregados neste momento.'
    });
  });

  it('represents official Senado associated proposals as unavailable without fixture fallback', async () => {
    await executeSearch('maria', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [
          {
            id: 'senado-20',
            source: 'senado',
            sourceId: '20',
            name: 'Maria Souza',
            office: 'Senador'
          }
        ],
        proposals: []
      })
    });
    await selectParliamentarianById('senado-20', {
      getOfficialParliamentarianDetail: async (parliamentarian) => ({
        status: 'fulfilled',
        data: parliamentarian,
        errors: []
      })
    });

    const fixtureProposalsLoader = vi.fn();

    await expect(
      openParliamentarianBills({
        getFixtureProposalsByParliamentarianId: fixtureProposalsLoader,
        getOfficialProposalsByParliamentarian: async () => ({
          status: 'unavailable',
          data: [],
          errors: [
            {
              source: 'senado',
              entity: 'parliamentarian-proposals',
              kind: 'unsupported-source',
              message: officialSenadoAssociatedMattersUnavailableMessage
            }
          ]
        })
      })
    ).resolves.toBe(true);

    expect(fixtureProposalsLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_BILLS',
      parliamentarianProposals: [],
      errorMessage: officialSenadoAssociatedMattersUnavailableMessage
    });
  });

  it('opens associated votes and selects a vote through guided actions', async () => {
    await executeFixtureSearch('ana');

    await expect(selectParliamentarianById('parliamentarian-ana-costa')).resolves.toBe(true);
    expect(openParliamentarianVotes()).toBe(true);

    const votesContext = get(chatStore);

    expect(votesContext.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(votesContext.voteHistory.map((vote) => vote.proposalId)).toEqual([
      'PL 1234/2024',
      'PL 220/2025'
    ]);
    expect(votesContext.selectedProposal).toBeNull();
    expect(votesContext.selectedVote).toBeNull();

    expect(selectVoteById('vote-pl-1234-2024-texto-base')).toBe(true);

    const voteDetailContext = get(chatStore);

    expect(voteDetailContext.currentState).toBe('BILL_VOTES');
    expect(voteDetailContext.selectedVote?.proposalId).toBe('PL 1234/2024');
    expect(voteDetailContext.selectedProposal).toBeNull();
  });

  it('keeps controlled vote fixtures available for non official parliamentarians', async () => {
    await executeFixtureSearch('ana');

    await expect(selectParliamentarianById('parliamentarian-ana-costa')).resolves.toBe(true);

    const controlledVote = createControlledVote('controlled-non-official-vote');
    const fixtureVotesLoader = vi.fn(() => [controlledVote]);

    expect(
      openParliamentarianVotes({
        getFixtureVotesByParliamentarianId: fixtureVotesLoader
      })
    ).toBe(true);
    expect(fixtureVotesLoader).toHaveBeenCalledWith('parliamentarian-ana-costa');
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      voteHistory: [
        {
          id: 'controlled-non-official-vote',
          proposalId: 'PL 9/2026'
        }
      ],
      errorMessage: ''
    });

    const fixtureVoteDetailLoader = vi.fn(() => createControlledVote('unused-controlled-detail'));

    expect(
      selectVoteById('controlled-non-official-vote', {
        getFixtureVoteByIdForParliamentarian: fixtureVoteDetailLoader
      })
    ).toBe(true);
    expect(fixtureVoteDetailLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_VOTES',
      selectedVote: {
        id: 'controlled-non-official-vote',
        proposalId: 'PL 9/2026'
      }
    });
  });
});
