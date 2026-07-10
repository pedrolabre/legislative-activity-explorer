import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { LegislativeProposal, Parliamentarian, RollCallVote } from '$lib/domain';
import { searchPublicRecords } from '$lib/services/publicSearchService';
import type { SearchResults } from '$lib/services/searchResults';
import {
  chatStore,
  executeSearch,
  goBack,
  hasOfficialParliamentarianIdPattern,
  hasOfficialProposalIdPattern,
  initialChatContext,
  navigateTo,
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianVoteHistoryUnavailableMessage,
  officialSenadoAssociatedMattersUnavailableMessage,
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

function createOfficialParliamentarian(
  overrides: Partial<Parliamentarian> = {}
): Parliamentarian {
  return {
    id: 'camara-10',
    origin: 'official',
    source: 'camara',
    sourceId: '10',
    name: 'Ana Costa',
    office: 'Deputado federal',
    party: 'ABC',
    state: 'MG',
    status: 'Em exercício',
    ...overrides
  };
}

function createOfficialProposal(
  overrides: Partial<LegislativeProposal> = {}
): LegislativeProposal {
  return {
    id: 'camara-proposicao-1234',
    origin: 'official',
    source: 'camara',
    sourceId: '1234',
    title: 'PL 1234/2024',
    type: 'PL',
    number: '1234',
    year: 2024,
    subject: 'Educação',
    status: 'Em tramitação',
    relationship: 'Autoria',
    officialSummary: 'Ementa oficial controlada para teste.',
    references: [],
    ...overrides
  };
}

function createControlledVote(
  id = 'camara-votacao-1234-1',
  overrides: Partial<RollCallVote> = {}
): RollCallVote {
  return {
    id,
    source: 'camara',
    sourceId: id,
    proposalId: 'PL 1234/2024',
    description: 'Votação controlada para teste.',
    individualVotes: [],
    ...overrides
  };
}

function createControlledSearchResults(query: string): SearchResults {
  const normalizedQuery = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

  if (normalizedQuery.includes('sem resultado')) {
    return {
      parliamentarians: [],
      proposals: []
    };
  }

  if (normalizedQuery.includes('educacao')) {
    return {
      parliamentarians: [createOfficialParliamentarian()],
      proposals: [createOfficialProposal()]
    };
  }

  if (normalizedQuery.includes('pec 45')) {
    return {
      parliamentarians: [],
      proposals: [
        createOfficialProposal({
          id: 'senado-processo-9046221',
          source: 'senado',
          sourceId: '9046221',
          title: 'PEC 45/2023',
          type: 'PEC',
          number: '45',
          year: 2023,
          subject: 'Saúde pública',
          relationship: undefined
        })
      ]
    };
  }

  if (normalizedQuery.includes('ana')) {
    return {
      parliamentarians: [createOfficialParliamentarian()],
      proposals: []
    };
  }

  return {
    parliamentarians: [],
    proposals: []
  };
}

function executeControlledOfficialSearch(query: string, results = createControlledSearchResults(query)) {
  return executeSearch(query, {
    delayMs: 0,
    search: () => results
  });
}

function fulfilledParliamentarianDetail(parliamentarian: Parliamentarian) {
  return Promise.resolve({
    status: 'fulfilled' as const,
    data: parliamentarian,
    errors: []
  });
}

function fulfilledProposalDetail(proposal: LegislativeProposal) {
  return Promise.resolve({
    status: 'fulfilled' as const,
    data: proposal,
    errors: []
  });
}

function fulfilledProposalVotes(votes: RollCallVote[] = []) {
  return Promise.resolve({
    status: 'fulfilled' as const,
    data: votes,
    errors: []
  });
}

function selectControlledOfficialParliamentarian(id = 'camara-10') {
  return selectParliamentarianById(id, {
    getOfficialParliamentarianDetail: fulfilledParliamentarianDetail
  });
}

function openControlledOfficialBills(proposals: LegislativeProposal[] = [createOfficialProposal()]) {
  return openParliamentarianBills({
    getOfficialProposalsByParliamentarian: async () => ({
      status: 'fulfilled',
      data: proposals,
      errors: []
    })
  });
}

function selectControlledOfficialProposal(
  id = 'camara-proposicao-1234',
  votes: RollCallVote[] = []
) {
  return selectProposalById(id, {
    getOfficialProposalDetail: fulfilledProposalDetail,
    getOfficialVotesByProposal: async () => fulfilledProposalVotes(votes)
  });
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
      parliamentarians: [createOfficialParliamentarian()],
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

  it('classifies official parliamentarian and proposal id patterns without mixing Senado process proposals', () => {
    expect(hasOfficialParliamentarianIdPattern('camara-10')).toBe(true);
    expect(hasOfficialParliamentarianIdPattern('senado-20')).toBe(true);
    expect(hasOfficialParliamentarianIdPattern('camara-proposicao-2630')).toBe(false);
    expect(hasOfficialParliamentarianIdPattern('senado-materia-300')).toBe(false);
    expect(hasOfficialParliamentarianIdPattern('senado-processo-9046221')).toBe(false);

    expect(hasOfficialProposalIdPattern('camara-proposicao-2630')).toBe(true);
    expect(hasOfficialProposalIdPattern('senado-materia-300')).toBe(true);
    expect(hasOfficialProposalIdPattern('senado-processo-9046221')).toBe(true);
  });

  it('routes a search with no matches to an empty result state', async () => {
    await executeControlledOfficialSearch('termo sem resultado');

    expect(get(chatStore)).toMatchObject({
      currentState: 'SEARCH_RESULTS',
      historyStack: [],
      lastQuery: 'termo sem resultado',
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

  it('routes a shared term search to multiple official result groups', async () => {
    await executeControlledOfficialSearch('educacao');

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
    await executeControlledOfficialSearch('ana');

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
    await executeControlledOfficialSearch('PEC 45');

    const context = get(chatStore);

    expect(context.currentState).toBe('SEARCH_RESULTS');
    expect(context.lastQuery).toBe('PEC 45');
    expect(context.parliamentariansFound).toEqual([]);
    expect(context.proposalsFound.map((proposal) => proposal.title)).toEqual(['PEC 45/2023']);
    expect(context.selectedProposal).toBeNull();
  });

  it('opens a single direct official proposal search immediately without a parliamentarian', async () => {
    const directProposal = createOfficialProposal({
      id: 'camara-proposicao-2630',
      sourceId: '2630',
      title: 'PL 2630/2020',
      number: '2630',
      year: 2020,
      officialSummary: 'Ementa oficial retornada pela busca.'
    });
    const officialVote = createControlledVote('camara-votacao-2630-1', {
      sourceId: '2630-1',
      proposalId: 'PL 2630/2020',
      description: 'Votação oficial controlada.'
    });
    const officialVotesLoader = vi.fn(async () => fulfilledProposalVotes([officialVote]));

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
    const directProposal = createOfficialProposal({
      id: 'senado-processo-9046221',
      source: 'senado',
      sourceId: '9046221',
      title: 'RQS 368/2026',
      type: 'RQS',
      number: '368',
      year: 2026,
      officialSummary: 'Ementa oficial retornada pela busca.',
      relationship: undefined
    });
    const officialVote = createControlledVote('senado-votacao-5969', {
      source: 'senado',
      sourceId: '5969',
      proposalId: 'RQS 368/2026',
      description: 'Votação oficial do Senado controlada.'
    });
    const officialVotesLoader = vi.fn(async () => fulfilledProposalVotes([officialVote]));

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
          officialSummary: 'Detalhe moderno oficial da matéria.'
        },
        errors: []
      }),
      getOfficialVotesByProposal: officialVotesLoader
    });

    expect(officialVotesLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'senado-processo-9046221'
      })
    );
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
        officialSummary: 'Detalhe moderno oficial da matéria.'
      },
      voteHistory: [
        {
          id: 'senado-votacao-5969',
          proposalId: 'RQS 368/2026'
        }
      ],
      errorMessage: ''
    });
  });

  it('opens an official proposal result manually without selecting a parliamentarian', async () => {
    await executeSearch('PEC 45', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [],
        proposals: [
          createOfficialProposal({
            id: 'camara-proposicao-451',
            sourceId: '451',
            title: 'PEC 45/2019',
            type: 'PEC',
            number: '45',
            year: 2019,
            subject: undefined,
            officialSummary: undefined
          })
        ],
        recoverableMessage:
          'Mais de uma proposição oficial corresponde a PEC 45. Informe o ano ou selecione um resultado oficial exibido.'
      })
    });

    const officialVotesLoader = vi.fn(async () => fulfilledProposalVotes());

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
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();
    await openControlledOfficialBills();
    await selectControlledOfficialProposal();

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

  it('selects a parliamentarian and a proposal through guided official actions', async () => {
    await executeControlledOfficialSearch('ana');

    await expect(selectControlledOfficialParliamentarian()).resolves.toBe(true);

    const parliamentarianContext = get(chatStore);

    expect(parliamentarianContext.currentState).toBe('PARLIAMENTARIAN_DETAIL');
    expect(parliamentarianContext.selectedParliamentarian).toMatchObject({
      id: 'camara-10',
      name: 'Ana Costa'
    });
    expect(parliamentarianContext.parliamentarianProposals).toEqual([]);
    expect(parliamentarianContext.selectedProposal).toBeNull();
    expect(parliamentarianContext.selectedVote).toBeNull();
    expect(parliamentarianContext.voteHistory).toEqual([]);

    await expect(
      openControlledOfficialBills([
        createOfficialProposal({
          id: 'camara-proposicao-220',
          sourceId: '220',
          title: 'PL 220/2025',
          number: '220',
          year: 2025
        }),
        createOfficialProposal()
      ])
    ).resolves.toBe(true);

    const billsContext = get(chatStore);

    expect(billsContext.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(billsContext.parliamentarianProposals.map((proposal) => proposal.title)).toEqual([
      'PL 220/2025',
      'PL 1234/2024'
    ]);
    expect(billsContext.selectedProposal).toBeNull();
    expect(billsContext.selectedVote).toBeNull();

    await expect(selectControlledOfficialProposal()).resolves.toBe(true);

    const proposalContext = get(chatStore);

    expect(proposalContext.currentState).toBe('BILL_DETAIL');
    expect(proposalContext.selectedParliamentarian?.name).toBe('Ana Costa');
    expect(proposalContext.selectedProposal?.title).toBe('PL 1234/2024');
    expect(proposalContext.selectedVote).toBeNull();
  });

  it('returns through the deterministic history stack', async () => {
    await executeControlledOfficialSearch('ana');

    await selectControlledOfficialParliamentarian();
    await openControlledOfficialBills();
    await selectControlledOfficialProposal();

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
    await executeControlledOfficialSearch('ana');

    await expect(
      selectParliamentarianById('camara-10', {
        getOfficialParliamentarianDetail: async (parliamentarian) => ({
          status: 'fulfilled',
          data: {
            ...parliamentarian,
            fullName: 'Ana Costa Pereira',
            email: 'dep.ana@camara.leg.br'
          },
          errors: []
        })
      })
    ).resolves.toBe(true);

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
    await executeControlledOfficialSearch('maria', {
      parliamentarians: [
        createOfficialParliamentarian({
          id: 'senado-20',
          source: 'senado',
          sourceId: '20',
          name: 'Maria Souza',
          office: 'Senador',
          party: undefined,
          state: undefined,
          status: undefined
        })
      ],
      proposals: []
    });

    await expect(
      selectParliamentarianById('senado-20', {
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
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();

    await expect(
      openControlledOfficialBills([
        createOfficialProposal({
          id: 'camara-proposicao-100',
          sourceId: '100',
          title: 'PL 2/2024',
          number: '2',
          year: 2024
        })
      ])
    ).resolves.toBe(true);

    const officialVote = createControlledVote('camara-votacao-100-1', {
      sourceId: '100-1',
      proposalId: 'PL 2/2024',
      votedAt: '2024-06-12',
      description: 'Votação nominal oficial.',
      individualVotes: [
        {
          parliamentarianId: 'camara-10',
          parliamentarianName: 'Ana Costa',
          party: 'ABC',
          state: 'MG',
          vote: 'SIM'
        }
      ]
    });
    const officialVotesLoader = vi.fn(async () => fulfilledProposalVotes([officialVote]));

    await expect(
      selectProposalById('camara-proposicao-100', {
        getOfficialProposalDetail: async (proposal) => ({
          status: 'fulfilled',
          data: {
            ...proposal,
            officialSummary: 'Detalhe oficial controlado.'
          },
          errors: []
        }),
        getOfficialVotesByProposal: officialVotesLoader
      })
    ).resolves.toBe(true);

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

    expect(selectVoteById('camara-votacao-100-1')).toBe(true);
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
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();
    await openControlledOfficialBills([
      createOfficialProposal({
        id: 'camara-proposicao-100',
        sourceId: '100',
        title: 'PL 2/2024',
        number: '2',
        year: 2024,
        subject: 'Transparência pública',
        status: 'Em tramitação',
        officialSummary: 'Ementa parcial vinda da lista oficial.'
      })
    ]);

    const officialVotesLoader = vi.fn(async () => fulfilledProposalVotes());

    await expect(
      selectProposalById('camara-proposicao-100', {
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

    expect(officialVotesLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'camara-proposicao-100'
      })
    );
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_DETAIL',
      selectedProposal: {
        id: 'camara-proposicao-100',
        subject: 'Transparência pública',
        status: 'Em tramitação',
        relationship: 'Autoria',
        officialSummary: 'Ementa parcial vinda da lista oficial.'
      },
      errorMessage: 'Dados oficiais de proposição não puderam ser carregados neste momento.'
    });
  });

  it('represents official votes as unavailable without fallback data', async () => {
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();

    expect(openParliamentarianVotes()).toBe(true);
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      voteHistory: [],
      errorMessage: officialParliamentarianVoteHistoryUnavailableMessage
    });

    expect(selectVoteById('vote-inexistente')).toBe(false);
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      selectedVote: null
    });
  });

  it('uses official votes already loaded from opened proposals as session partial coverage', async () => {
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();
    await openControlledOfficialBills();

    const officialVote = createControlledVote('camara-votacao-1234-1', {
      votedAt: '2024-06-12',
      description: 'Votação nominal oficial.',
      individualVotes: [
        {
          parliamentarianId: 'camara-10',
          parliamentarianName: 'Ana Costa',
          party: 'ABC',
          state: 'MG',
          vote: 'SIM'
        }
      ]
    });

    await selectControlledOfficialProposal('camara-proposicao-1234', [officialVote]);
    navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });

    expect(openParliamentarianVotes()).toBe(true);
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      selectedProposal: null,
      voteHistory: [
        {
          id: 'camara-votacao-1234-1',
          proposalId: 'PL 1234/2024'
        }
      ],
      errorMessage: `${officialParliamentarianVoteHistoryUnavailableMessage} ${officialParliamentarianSessionVotesCoverageMessage}`
    });

    expect(selectVoteById('camara-votacao-1234-1')).toBe(true);
    expect(get(chatStore)).toMatchObject({
      currentState: 'BILL_VOTES',
      selectedVote: {
        id: 'camara-votacao-1234-1'
      }
    });
  });

  it('represents official Senado parliamentarian vote history as not loaded without fallback data', async () => {
    await executeControlledOfficialSearch('maria', {
      parliamentarians: [
        createOfficialParliamentarian({
          id: 'senado-20',
          source: 'senado',
          sourceId: '20',
          name: 'Maria Souza',
          office: 'Senador',
          party: undefined,
          state: undefined,
          status: undefined
        })
      ],
      proposals: []
    });
    await selectParliamentarianById('senado-20', {
      getOfficialParliamentarianDetail: fulfilledParliamentarianDetail
    });

    expect(openParliamentarianVotes()).toBe(true);
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      voteHistory: [],
      errorMessage: officialParliamentarianVoteHistoryUnavailableMessage
    });

    expect(selectVoteById('senado-votacao-inexistente')).toBe(false);
    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_VOTES',
      selectedVote: null
    });
  });

  it('records a neutral notice for partial official associated proposals', async () => {
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();

    await expect(
      openParliamentarianBills({
        getOfficialProposalsByParliamentarian: async () => ({
          status: 'partial',
          data: [
            createOfficialProposal({
              id: 'camara-proposicao-100',
              sourceId: '100',
              title: 'PL 2/2024',
              number: '2',
              year: 2024,
              subject: undefined,
              status: undefined,
              relationship: undefined,
              officialSummary: undefined
            })
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

  it('does not use fallback proposals when official associated proposals fail', async () => {
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();

    await expect(
      openParliamentarianBills({
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

    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_BILLS',
      parliamentarianProposals: [],
      errorMessage:
        'Dados oficiais de proposições associadas não puderam ser carregados neste momento.'
    });
  });

  it('represents official Senado associated proposals as unavailable without fallback data', async () => {
    await executeControlledOfficialSearch('maria', {
      parliamentarians: [
        createOfficialParliamentarian({
          id: 'senado-20',
          source: 'senado',
          sourceId: '20',
          name: 'Maria Souza',
          office: 'Senador',
          party: undefined,
          state: undefined,
          status: undefined
        })
      ],
      proposals: []
    });
    await selectParliamentarianById('senado-20', {
      getOfficialParliamentarianDetail: fulfilledParliamentarianDetail
    });

    await expect(
      openParliamentarianBills({
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

    expect(get(chatStore)).toMatchObject({
      currentState: 'PARLIAMENTARIAN_BILLS',
      parliamentarianProposals: [],
      errorMessage: officialSenadoAssociatedMattersUnavailableMessage
    });
  });

  it('opens associated votes and selects a vote through official session data', async () => {
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();
    await openControlledOfficialBills();

    const officialVote = createControlledVote('camara-votacao-1234-1', {
      votedAt: '2024-06-12',
      result: 'Aprovado',
      individualVotes: [
        {
          parliamentarianId: 'camara-10',
          parliamentarianName: 'Ana Costa',
          party: 'ABC',
          state: 'MG',
          vote: 'SIM'
        }
      ]
    });

    await selectControlledOfficialProposal('camara-proposicao-1234', [officialVote]);
    navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });

    expect(openParliamentarianVotes()).toBe(true);

    const votesContext = get(chatStore);

    expect(votesContext.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(votesContext.voteHistory.map((vote) => vote.proposalId)).toEqual(['PL 1234/2024']);
    expect(votesContext.selectedProposal).toBeNull();
    expect(votesContext.selectedVote).toBeNull();

    expect(selectVoteById('camara-votacao-1234-1')).toBe(true);

    const voteDetailContext = get(chatStore);

    expect(voteDetailContext.currentState).toBe('BILL_VOTES');
    expect(voteDetailContext.selectedVote?.proposalId).toBe('PL 1234/2024');
    expect(voteDetailContext.selectedProposal).toBeNull();
  });

  it('rejects official parliamentarian ids absent from the current search context', async () => {
    const officialDetailLoader = vi.fn(fulfilledParliamentarianDetail);

    await executeControlledOfficialSearch('ana');

    await expect(
      selectParliamentarianById('camara-999', {
        getOfficialParliamentarianDetail: officialDetailLoader
      })
    ).resolves.toBe(false);

    expect(officialDetailLoader).not.toHaveBeenCalled();
    expect(get(chatStore)).toMatchObject({
      currentState: 'SEARCH_RESULTS',
      selectedParliamentarian: null
    });
  });
});
