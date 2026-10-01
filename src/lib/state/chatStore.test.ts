import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import type { LegislativeProposal, Parliamentarian, RollCallVote } from '$lib/domain';
import { searchPublicRecords } from '$lib/services/publicSearchService';
import type { SearchResults } from '$lib/services/searchResults';
import type { ChatContext } from './chatStoreTypes';
import {
  ChatStateMachine,
  chatStore,
  createChatStateMachine,
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

function assertStoreParity(machine: ChatStateMachine = chatStore): void {
  const storeContext = get(machine);
  expect(machine.context).toEqual(storeContext);
  expect(machine.currentState).toBe(storeContext.currentState);
  expect(machine.historyStack).toEqual(storeContext.historyStack);
  expect(machine.lastQuery).toBe(storeContext.lastQuery);
  expect(machine.parliamentariansFound).toEqual(storeContext.parliamentariansFound);
  expect(machine.proposalsFound).toEqual(storeContext.proposalsFound);
  expect(machine.selectedParliamentarian).toEqual(storeContext.selectedParliamentarian);
  expect(machine.parliamentarianProposals).toEqual(storeContext.parliamentarianProposals);
  expect(machine.selectedProposal).toEqual(storeContext.selectedProposal);
  expect(machine.selectedVote).toEqual(storeContext.selectedVote);
  expect(machine.voteHistory).toEqual(storeContext.voteHistory);
  expect(machine.errorMessage).toBe(storeContext.errorMessage);
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
    assertStoreParity(chatStore);
  });

  it('starts with a welcome context in memory', () => {
    expect(get(chatStore)).toEqual(initialChatContext);
    expect(chatStore.currentState).toBe('WELCOME');
    expect(chatStore.historyStack).toEqual([]);
    assertStoreParity(chatStore);
  });

  it('navigates to a new state and returns through the history stack', () => {
    navigateTo('ABOUT');

    expect(chatStore.currentState).toBe('ABOUT');
    expect(get(chatStore).currentState).toBe('ABOUT');
    expect(chatStore.historyStack).toEqual(['WELCOME']);
    expect(get(chatStore).historyStack).toEqual(['WELCOME']);
    assertStoreParity(chatStore);

    goBack();

    expect(chatStore.currentState).toBe('WELCOME');
    expect(get(chatStore).currentState).toBe('WELCOME');
    expect(chatStore.historyStack).toEqual([]);
    expect(get(chatStore).historyStack).toEqual([]);
    assertStoreParity(chatStore);
  });

  it('ignores an empty search term', async () => {
    await executeSearch('   ', { delayMs: 0 });

    expect(chatStore.context).toEqual(initialChatContext);
    expect(get(chatStore)).toEqual(initialChatContext);
    assertStoreParity(chatStore);
  });

  it('uses public official search as the runtime default', async () => {
    mockedSearchPublicRecords.mockResolvedValueOnce({
      parliamentarians: [createOfficialParliamentarian()],
      proposals: [],
      recoverableMessage: 'Parte das fontes oficiais não respondeu nesta consulta.'
    });

    await executeSearch(' ana ', { delayMs: 0 });

    expect(mockedSearchPublicRecords).toHaveBeenCalledWith(
      'ana',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
    expect(chatStore.lastQuery).toBe('ana');
    expect(chatStore.parliamentariansFound).toEqual([
      expect.objectContaining({
        id: 'camara-10',
        name: 'Ana Costa'
      })
    ]);
    expect(chatStore.proposalsFound).toEqual([]);
    expect(chatStore.errorMessage).toBe('Parte das fontes oficiais não respondeu nesta consulta.');
    assertStoreParity(chatStore);
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

    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
    expect(chatStore.historyStack).toEqual([]);
    expect(chatStore.lastQuery).toBe('termo sem resultado');
    expect(chatStore.parliamentariansFound).toEqual([]);
    expect(chatStore.proposalsFound).toEqual([]);
    expect(chatStore.selectedParliamentarian).toBeNull();
    expect(chatStore.parliamentarianProposals).toEqual([]);
    expect(chatStore.selectedProposal).toBeNull();
    expect(chatStore.selectedVote).toBeNull();
    expect(chatStore.voteHistory).toEqual([]);
    expect(chatStore.errorMessage).toBe('');
    assertStoreParity(chatStore);
  });

  it('routes a shared term search to multiple official result groups', async () => {
    await executeControlledOfficialSearch('educacao');

    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
    expect(chatStore.lastQuery).toBe('educacao');
    expect(chatStore.parliamentariansFound.map((parliamentarian) => parliamentarian.name)).toEqual([
      'Ana Costa'
    ]);
    expect(chatStore.proposalsFound.map((proposal) => proposal.title)).toEqual(['PL 1234/2024']);
    expect(chatStore.selectedParliamentarian).toBeNull();
    expect(chatStore.selectedProposal).toBeNull();
    expect(chatStore.selectedVote).toBeNull();
    assertStoreParity(chatStore);
  });

  it('routes a parliamentarian search without persistence', async () => {
    await executeControlledOfficialSearch('ana');

    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
    expect(chatStore.lastQuery).toBe('ana');
    expect(chatStore.parliamentariansFound.map((parliamentarian) => parliamentarian.name)).toEqual([
      'Ana Costa'
    ]);
    expect(chatStore.proposalsFound).toEqual([]);
    expect(chatStore.selectedParliamentarian).toBeNull();
    assertStoreParity(chatStore);
  });

  it('routes a proposal search without selecting a proposal automatically', async () => {
    await executeControlledOfficialSearch('PEC 45');

    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
    expect(chatStore.lastQuery).toBe('PEC 45');
    expect(chatStore.parliamentariansFound).toEqual([]);
    expect(chatStore.proposalsFound.map((proposal) => proposal.title)).toEqual(['PEC 45/2023']);
    expect(chatStore.selectedProposal).toBeNull();
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('BILL_DETAIL');
    expect(chatStore.historyStack).toEqual([]);
    expect(chatStore.lastQuery).toBe('PL 2630/2020');
    expect(chatStore.selectedParliamentarian).toBeNull();
    expect(chatStore.selectedProposal).toMatchObject({
      id: 'camara-proposicao-2630',
      officialSummary: expect.stringContaining('Detalhe oficial controlado')
    });
    expect(chatStore.voteHistory).toEqual([
      expect.objectContaining({
        id: 'camara-votacao-2630-1',
        proposalId: 'PL 2630/2020'
      })
    ]);
    expect(chatStore.errorMessage).toBe('');
    assertStoreParity(chatStore);

    expect(selectVoteById('camara-votacao-2630-1')).toBe(true);
    expect(chatStore.currentState).toBe('BILL_VOTES');
    expect(chatStore.selectedParliamentarian).toBeNull();
    expect(chatStore.selectedProposal?.id).toBe('camara-proposicao-2630');
    expect(chatStore.selectedVote?.id).toBe('camara-votacao-2630-1');
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('BILL_DETAIL');
    expect(chatStore.historyStack).toEqual([]);
    expect(chatStore.lastQuery).toBe('RQS 368/2026');
    expect(chatStore.selectedParliamentarian).toBeNull();
    expect(chatStore.selectedProposal).toMatchObject({
      id: 'senado-processo-9046221',
      officialSummary: 'Detalhe moderno oficial da matéria.'
    });
    expect(chatStore.voteHistory).toEqual([
      expect.objectContaining({
        id: 'senado-votacao-5969',
        proposalId: 'RQS 368/2026'
      })
    ]);
    expect(chatStore.errorMessage).toBe('');
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('BILL_DETAIL');
    expect(chatStore.historyStack).toEqual(['SEARCH_RESULTS']);
    expect(chatStore.selectedParliamentarian).toBeNull();
    expect(chatStore.selectedProposal).toMatchObject({
      id: 'camara-proposicao-451',
      officialSummary: 'Detalhe oficial da PEC controlada.'
    });
    expect(chatStore.voteHistory).toEqual([]);
    expect(chatStore.errorMessage).toBe('');
    assertStoreParity(chatStore);
  });

  it('resets search results and selections to a new initial context', async () => {
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();
    await openControlledOfficialBills();
    await selectControlledOfficialProposal();

    reset();

    expect(chatStore.context).toEqual(initialChatContext);
    expect(chatStore.context).not.toBe(initialChatContext);
    expect(chatStore.currentState).toBe('WELCOME');
    assertStoreParity(chatStore);
  });

  it('records a neutral recoverable error when search execution fails', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      search: () => {
        throw new Error('controlled failure');
      }
    });

    expect(chatStore.currentState).toBe('ERROR');
    expect(chatStore.errorMessage).toContain('concluir a busca');
    assertStoreParity(chatStore);

    reset();

    expect(chatStore.context).toEqual(initialChatContext);
    assertStoreParity(chatStore);
  });

  it('selects a parliamentarian and a proposal through guided official actions', async () => {
    await executeControlledOfficialSearch('ana');

    await expect(selectControlledOfficialParliamentarian()).resolves.toBe(true);

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_DETAIL');
    expect(chatStore.selectedParliamentarian).toMatchObject({
      id: 'camara-10',
      name: 'Ana Costa'
    });
    expect(chatStore.parliamentarianProposals).toEqual([]);
    expect(chatStore.selectedProposal).toBeNull();
    expect(chatStore.selectedVote).toBeNull();
    expect(chatStore.voteHistory).toEqual([]);
    assertStoreParity(chatStore);

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

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(chatStore.parliamentarianProposals.map((proposal) => proposal.title)).toEqual([
      'PL 220/2025',
      'PL 1234/2024'
    ]);
    expect(chatStore.selectedProposal).toBeNull();
    expect(chatStore.selectedVote).toBeNull();
    assertStoreParity(chatStore);

    await expect(selectControlledOfficialProposal()).resolves.toBe(true);

    expect(chatStore.currentState).toBe('BILL_DETAIL');
    expect(chatStore.selectedParliamentarian?.name).toBe('Ana Costa');
    expect(chatStore.selectedProposal?.title).toBe('PL 1234/2024');
    expect(chatStore.selectedVote).toBeNull();
    assertStoreParity(chatStore);
  });

  it('returns through the deterministic history stack', async () => {
    await executeControlledOfficialSearch('ana');

    await selectControlledOfficialParliamentarian();
    await openControlledOfficialBills();
    await selectControlledOfficialProposal();

    expect(chatStore.historyStack).toEqual([
      'SEARCH_RESULTS',
      'PARLIAMENTARIAN_DETAIL',
      'PARLIAMENTARIAN_BILLS'
    ]);
    assertStoreParity(chatStore);

    goBack();

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(chatStore.historyStack).toEqual(['SEARCH_RESULTS', 'PARLIAMENTARIAN_DETAIL']);
    assertStoreParity(chatStore);

    goBack();

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_DETAIL');
    expect(chatStore.historyStack).toEqual(['SEARCH_RESULTS']);
    assertStoreParity(chatStore);

    goBack();

    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
    expect(chatStore.historyStack).toEqual([]);
    assertStoreParity(chatStore);
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

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_DETAIL');
    expect(chatStore.selectedParliamentarian).toMatchObject({
      id: 'camara-10',
      fullName: 'Ana Costa Pereira',
      party: 'ABC',
      state: 'MG',
      email: 'dep.ana@camara.leg.br'
    });
    expect(chatStore.parliamentarianProposals).toEqual([]);
    expect(chatStore.errorMessage).toBe('');
    assertStoreParity(chatStore);
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

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_DETAIL');
    expect(chatStore.selectedParliamentarian).toMatchObject({
      id: 'senado-20',
      name: 'Maria Souza'
    });
    expect(chatStore.errorMessage).toBe(
      'Dados oficiais de parlamentar não puderam ser carregados neste momento.'
    );
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('BILL_DETAIL');
    expect(chatStore.selectedProposal).toMatchObject({
      id: 'camara-proposicao-100',
      relationship: 'Autoria',
      officialSummary: 'Detalhe oficial controlado.'
    });
    expect(chatStore.voteHistory).toEqual([
      expect.objectContaining({
        id: 'camara-votacao-100-1',
        proposalId: 'PL 2/2024'
      })
    ]);
    expect(chatStore.errorMessage).toBe('');
    assertStoreParity(chatStore);

    expect(selectVoteById('camara-votacao-100-1')).toBe(true);
    expect(chatStore.currentState).toBe('BILL_VOTES');
    expect(chatStore.selectedProposal?.id).toBe('camara-proposicao-100');
    expect(chatStore.selectedVote?.id).toBe('camara-votacao-100-1');
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('BILL_DETAIL');
    expect(chatStore.selectedProposal).toMatchObject({
      id: 'camara-proposicao-100',
      subject: 'Transparência pública',
      status: 'Em tramitação',
      relationship: 'Autoria',
      officialSummary: 'Ementa parcial vinda da lista oficial.'
    });
    expect(chatStore.errorMessage).toBe(
      'Dados oficiais de proposição não puderam ser carregados neste momento.'
    );
    assertStoreParity(chatStore);
  });

  it('represents official votes as unavailable without fallback data', async () => {
    await executeControlledOfficialSearch('ana');
    await selectControlledOfficialParliamentarian();

    expect(openParliamentarianVotes()).toBe(true);
    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(chatStore.voteHistory).toEqual([]);
    expect(chatStore.errorMessage).toBe(officialParliamentarianVoteHistoryUnavailableMessage);
    assertStoreParity(chatStore);

    expect(selectVoteById('vote-inexistente')).toBe(false);
    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(chatStore.selectedVote).toBeNull();
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(chatStore.selectedProposal).toBeNull();
    expect(chatStore.voteHistory).toEqual([
      expect.objectContaining({
        id: 'camara-votacao-1234-1',
        proposalId: 'PL 1234/2024'
      })
    ]);
    expect(chatStore.errorMessage).toBe(
      `${officialParliamentarianVoteHistoryUnavailableMessage} ${officialParliamentarianSessionVotesCoverageMessage}`
    );
    assertStoreParity(chatStore);

    expect(selectVoteById('camara-votacao-1234-1')).toBe(true);
    expect(chatStore.currentState).toBe('BILL_VOTES');
    expect(chatStore.selectedVote?.id).toBe('camara-votacao-1234-1');
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(chatStore.voteHistory).toEqual([]);
    expect(chatStore.errorMessage).toBe(officialParliamentarianVoteHistoryUnavailableMessage);
    assertStoreParity(chatStore);

    expect(selectVoteById('senado-votacao-inexistente')).toBe(false);
    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(chatStore.selectedVote).toBeNull();
    assertStoreParity(chatStore);
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

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(chatStore.parliamentarianProposals).toEqual([
      expect.objectContaining({
        id: 'camara-proposicao-100',
        title: 'PL 2/2024'
      })
    ]);
    expect(chatStore.errorMessage).toBe(
      'Dados oficiais de proposições associadas vieram incompletos nesta consulta.'
    );
    assertStoreParity(chatStore);
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

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(chatStore.parliamentarianProposals).toEqual([]);
    expect(chatStore.errorMessage).toBe(
      'Dados oficiais de proposições associadas não puderam ser carregados neste momento.'
    );
    assertStoreParity(chatStore);
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

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(chatStore.parliamentarianProposals).toEqual([]);
    expect(chatStore.errorMessage).toBe(officialSenadoAssociatedMattersUnavailableMessage);
    assertStoreParity(chatStore);
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

    expect(chatStore.currentState).toBe('PARLIAMENTARIAN_VOTES');
    expect(chatStore.voteHistory.map((vote) => vote.proposalId)).toEqual(['PL 1234/2024']);
    expect(chatStore.selectedProposal).toBeNull();
    expect(chatStore.selectedVote).toBeNull();
    assertStoreParity(chatStore);

    expect(selectVoteById('camara-votacao-1234-1')).toBe(true);

    expect(chatStore.currentState).toBe('BILL_VOTES');
    expect(chatStore.selectedVote?.proposalId).toBe('PL 1234/2024');
    expect(chatStore.selectedProposal).toBeNull();
    assertStoreParity(chatStore);
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
    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
    expect(chatStore.selectedParliamentarian).toBeNull();
    assertStoreParity(chatStore);
  });
});

describe('Svelte 5 Runes state machine and reactivity contract', () => {
  beforeEach(() => {
    reset();
  });

  it('provides direct reactive getter access matching context properties', () => {
    expect(chatStore.currentState).toBe('WELCOME');
    expect(chatStore.historyStack).toEqual([]);
    expect(chatStore.lastQuery).toBe('');
    expect(chatStore.parliamentariansFound).toEqual([]);
    expect(chatStore.proposalsFound).toEqual([]);
    expect(chatStore.selectedParliamentarian).toBeNull();
    expect(chatStore.parliamentarianProposals).toEqual([]);
    expect(chatStore.selectedProposal).toBeNull();
    expect(chatStore.selectedVote).toBeNull();
    expect(chatStore.voteHistory).toEqual([]);
    expect(chatStore.errorMessage).toBe('');
    expect(chatStore.context).toEqual(initialChatContext);
    assertStoreParity(chatStore);

    navigateTo('ABOUT');

    expect(chatStore.currentState).toBe('ABOUT');
    expect(chatStore.historyStack).toEqual(['WELCOME']);
    expect(chatStore.context.currentState).toBe('ABOUT');
    assertStoreParity(chatStore);
  });

  it('verifies 100% parity across all 12 reactive getters and get(store) across state transitions', async () => {
    const machine = createChatStateMachine();
    assertStoreParity(machine);

    machine.navigateTo('ABOUT');
    assertStoreParity(machine);

    await machine.executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [createOfficialParliamentarian()],
        proposals: [createOfficialProposal()]
      })
    });
    assertStoreParity(machine);

    await machine.selectParliamentarianById('camara-10', {
      getOfficialParliamentarianDetail: fulfilledParliamentarianDetail
    });
    assertStoreParity(machine);

    await machine.openParliamentarianBills({
      getOfficialProposalsByParliamentarian: async () => ({
        status: 'fulfilled',
        data: [createOfficialProposal()],
        errors: []
      })
    });
    assertStoreParity(machine);

    await machine.selectProposalById('camara-proposicao-1234', {
      getOfficialProposalDetail: fulfilledProposalDetail,
      getOfficialVotesByProposal: async () => fulfilledProposalVotes([createControlledVote()])
    });
    assertStoreParity(machine);

    machine.selectVoteById('camara-votacao-1234-1');
    assertStoreParity(machine);

    machine.goBack();
    assertStoreParity(machine);

    machine.reset();
    assertStoreParity(machine);
  });

  it('notifies subscribers synchronously on subscription and upon transitions', () => {
    const snapshots: string[] = [];
    const unsubscribe = chatStore.subscribe((ctx) => {
      snapshots.push(ctx.currentState);
    });

    expect(snapshots).toEqual(['WELCOME']);

    navigateTo('ABOUT');
    navigateTo('SEARCH_RESULTS');
    goBack();

    expect(snapshots).toEqual(['WELCOME', 'ABOUT', 'SEARCH_RESULTS', 'ABOUT']);

    unsubscribe();
    navigateTo('WELCOME');

    expect(snapshots).toEqual(['WELCOME', 'ABOUT', 'SEARCH_RESULTS', 'ABOUT']);
  });

  it('supports isolated state machines via createChatStateMachine without cross-talk', () => {
    const isolatedMachine = createChatStateMachine();

    expect(isolatedMachine).toBeInstanceOf(ChatStateMachine);
    expect(isolatedMachine.currentState).toBe('WELCOME');
    expect(chatStore.currentState).toBe('WELCOME');

    isolatedMachine.navigateTo('ABOUT');

    expect(isolatedMachine.currentState).toBe('ABOUT');
    expect(chatStore.currentState).toBe('WELCOME');

    chatStore.navigateTo('SEARCH_RESULTS');

    expect(isolatedMachine.currentState).toBe('ABOUT');
    expect(chatStore.currentState).toBe('SEARCH_RESULTS');
  });

  it('supports set and update store contract methods', () => {
    const isolatedMachine = createChatStateMachine();

    isolatedMachine.set({
      ...initialChatContext,
      currentState: 'ERROR',
      errorMessage: 'Erro simulado'
    });

    expect(isolatedMachine.currentState).toBe('ERROR');
    expect(isolatedMachine.errorMessage).toBe('Erro simulado');
    assertStoreParity(isolatedMachine);

    isolatedMachine.update((ctx) => ({
      ...ctx,
      errorMessage: 'Erro atualizado'
    }));

    expect(isolatedMachine.errorMessage).toBe('Erro atualizado');
    assertStoreParity(isolatedMachine);
  });

  it('cancels pending searches and clears timers deterministically upon reset', async () => {
    const slowSearch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ parliamentarians: [], proposals: [] }), 200)
        )
    );

    const isolatedMachine = createChatStateMachine();
    const searchPromise = isolatedMachine.executeSearch('termo', {
      delayMs: 100,
      search: slowSearch
    });

    isolatedMachine.reset();
    await searchPromise;

    expect(isolatedMachine.currentState).toBe('WELCOME');
    expect(isolatedMachine.lastQuery).toBe('');
    assertStoreParity(isolatedMachine);
  });
});

describe('ChatStateMachine lifecycle, isolated instances, and subscribers', () => {
  it('initializes with a custom initialContext and isolates against subsequent external mutations', () => {
    const customContext: ChatContext = {
      ...initialChatContext,
      currentState: 'SEARCH_RESULTS',
      lastQuery: 'educacao',
      parliamentariansFound: [createOfficialParliamentarian({ id: 'camara-5', name: 'Carlos Dias' })],
      errorMessage: 'Aviso inicial'
    };

    const machine = createChatStateMachine(customContext);

    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.lastQuery).toBe('educacao');
    expect(machine.parliamentariansFound).toEqual(customContext.parliamentariansFound);
    expect(machine.errorMessage).toBe('Aviso inicial');
    assertStoreParity(machine);

    // External mutation must not bleed into machine internal state
    customContext.lastQuery = 'modificado externamente';
    expect(machine.lastQuery).toBe('educacao');
  });

  it('manages multiple subscribers with isolated callbacks and idempotent unsubscription', () => {
    const machine = createChatStateMachine();
    const sub1History: string[] = [];
    const sub2History: string[] = [];
    const sub3History: string[] = [];

    const unsub1 = machine.subscribe((ctx) => sub1History.push(ctx.currentState));
    const unsub2 = machine.subscribe((ctx) => sub2History.push(ctx.currentState));
    const unsub3 = machine.subscribe((ctx) => sub3History.push(ctx.currentState));

    expect(sub1History).toEqual(['WELCOME']);
    expect(sub2History).toEqual(['WELCOME']);
    expect(sub3History).toEqual(['WELCOME']);

    machine.navigateTo('ABOUT');

    expect(sub1History).toEqual(['WELCOME', 'ABOUT']);
    expect(sub2History).toEqual(['WELCOME', 'ABOUT']);
    expect(sub3History).toEqual(['WELCOME', 'ABOUT']);

    // Unsubscribe sub2 idempotently
    unsub2();
    expect(() => unsub2()).not.toThrow();
    expect(() => unsub2()).not.toThrow();

    machine.navigateTo('SEARCH_RESULTS');

    // sub2 remains at 'ABOUT', while sub1 and sub3 receive 'SEARCH_RESULTS'
    expect(sub1History).toEqual(['WELCOME', 'ABOUT', 'SEARCH_RESULTS']);
    expect(sub2History).toEqual(['WELCOME', 'ABOUT']);
    expect(sub3History).toEqual(['WELCOME', 'ABOUT', 'SEARCH_RESULTS']);

    // Clean up remaining subscribers
    unsub1();
    unsub3();
    machine.navigateTo('WELCOME');

    expect(sub1History).toEqual(['WELCOME', 'ABOUT', 'SEARCH_RESULTS']);
    expect(sub3History).toEqual(['WELCOME', 'ABOUT', 'SEARCH_RESULTS']);
  });

  it('notifies subscribers across set, update, and reset operations', () => {
    const machine = createChatStateMachine();
    const states: string[] = [];
    const unsub = machine.subscribe((ctx) => states.push(ctx.currentState));

    machine.set({
      ...initialChatContext,
      currentState: 'ABOUT'
    });

    machine.update((ctx) => ({
      ...ctx,
      currentState: 'SEARCH_RESULTS'
    }));

    machine.reset();

    unsub();

    expect(states).toEqual(['WELCOME', 'ABOUT', 'SEARCH_RESULTS', 'WELCOME']);
  });

  it('passes the exact same context reference to subscribers as returned by machine.context', () => {
    const machine = createChatStateMachine();
    let receivedContext: ChatContext | null = null;
    machine.subscribe((ctx) => {
      receivedContext = ctx;
    });

    expect(receivedContext).toBe(machine.context);

    machine.navigateTo('ABOUT');
    expect(receivedContext).toBe(machine.context);
  });
});

describe('Concurrency, search race conditions, and debounce hardening', () => {
  it('discards out-of-order stale search results when a newer search finishes first', async () => {
    const machine = createChatStateMachine();

    let resolveSlowSearch!: (value: SearchResults) => void;
    const slowSearchPromise = new Promise<SearchResults>((resolve) => {
      resolveSlowSearch = resolve;
    });

    const fastResults: SearchResults = {
      parliamentarians: [createOfficialParliamentarian({ id: 'camara-2', name: 'Bruno Lima' })],
      proposals: []
    };

    // Search 1: slow
    const search1Promise = machine.executeSearch('lenta', {
      delayMs: 0,
      search: () => slowSearchPromise
    });

    // Search 2: fast, dispatched immediately afterwards
    const search2Promise = machine.executeSearch('rapida', {
      delayMs: 0,
      search: () => fastResults
    });

    await search2Promise;

    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.lastQuery).toBe('rapida');
    expect(machine.parliamentariansFound[0].name).toBe('Bruno Lima');
    assertStoreParity(machine);

    // Resolve search 1 with stale data
    resolveSlowSearch({
      parliamentarians: [createOfficialParliamentarian({ id: 'camara-1', name: 'Ana Costa' })],
      proposals: []
    });

    await search1Promise;

    // Search 2 results must prevail
    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.lastQuery).toBe('rapida');
    expect(machine.parliamentariansFound[0].name).toBe('Bruno Lima');
    assertStoreParity(machine);
  });

  it('discards stale direct proposal resolution when interrupted by a subsequent search', async () => {
    const machine = createChatStateMachine();

    const slowDirectProposal = createOfficialProposal({
      id: 'camara-proposicao-9999',
      title: 'PL 9999/2026'
    });

    let resolveSlowDetail!: (value: {
      status: 'fulfilled';
      data: LegislativeProposal;
      errors: [];
    }) => void;
    const slowDetailPromise = new Promise<{
      status: 'fulfilled';
      data: LegislativeProposal;
      errors: [];
    }>((resolve) => {
      resolveSlowDetail = resolve;
    });

    // Search 1: returns direct proposal, but its detail resolution is slow
    const search1Promise = machine.executeSearch('PL 9999/2026', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [],
        proposals: [slowDirectProposal],
        directProposal: slowDirectProposal
      }),
      getOfficialProposalDetail: () => slowDetailPromise,
      getOfficialVotesByProposal: async () => fulfilledProposalVotes([])
    });

    // Allow microtick for search() to return and start awaiting detail
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Search 2: fast simple search
    const search2Promise = machine.executeSearch('ana', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [createOfficialParliamentarian()],
        proposals: []
      })
    });

    await search2Promise;
    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.lastQuery).toBe('ana');

    // Resolve slow detail of search 1
    resolveSlowDetail({
      status: 'fulfilled',
      data: { ...slowDirectProposal, officialSummary: 'Resumo lento' },
      errors: []
    });

    await search1Promise;

    // Must not have transitioned to BILL_DETAIL for PL 9999/2026
    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.lastQuery).toBe('ana');
    expect(machine.selectedProposal).toBeNull();
    assertStoreParity(machine);
  });

  it('ignores failure from an obsolete search when a newer search has already started', async () => {
    const machine = createChatStateMachine();

    let rejectSlowSearch!: (reason: unknown) => void;
    const slowSearchPromise = new Promise<SearchResults>((_, reject) => {
      rejectSlowSearch = reject;
    });

    const search1Promise = machine.executeSearch('falha-lenta', {
      delayMs: 0,
      search: () => slowSearchPromise
    });

    const search2Promise = machine.executeSearch('sucesso-rapido', {
      delayMs: 0,
      search: () => ({
        parliamentarians: [createOfficialParliamentarian()],
        proposals: []
      })
    });

    await search2Promise;
    expect(machine.currentState).toBe('SEARCH_RESULTS');

    // Reject search 1
    rejectSlowSearch(new Error('Falha de rede da busca antiga'));
    await search1Promise;

    // Must not transition to ERROR
    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.errorMessage).toBe('');
    assertStoreParity(machine);
  });

  it('cancels pending debounce timer when a new search is triggered before timer expiration', async () => {
    const machine = createChatStateMachine();
    const search1Fn = vi.fn(() => ({ parliamentarians: [], proposals: [] }));
    const search2Fn = vi.fn(() => ({
      parliamentarians: [createOfficialParliamentarian()],
      proposals: []
    }));

    const search1Promise = machine.executeSearch('primeira', {
      delayMs: 150,
      search: search1Fn
    });

    // Immediate second search before 150ms timeout
    const search2Promise = machine.executeSearch('segunda', {
      delayMs: 0,
      search: search2Fn
    });

    await Promise.all([search1Promise, search2Promise]);

    expect(search1Fn).not.toHaveBeenCalled();
    expect(search2Fn).toHaveBeenCalledWith(
      'segunda',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.lastQuery).toBe('segunda');
    assertStoreParity(machine);
  });

  it('cancels pending debounce timer and resolves cleanly when reset is invoked', async () => {
    const machine = createChatStateMachine();
    const searchFn = vi.fn(() => ({ parliamentarians: [], proposals: [] }));

    const searchPromise = machine.executeSearch('termo', {
      delayMs: 150,
      search: searchFn
    });

    machine.reset();
    await searchPromise;

    expect(searchFn).not.toHaveBeenCalled();
    expect(machine.currentState).toBe('WELCOME');
    expect(machine.lastQuery).toBe('');
    assertStoreParity(machine);
  });
});

describe('Navigation boundaries and defensive selection behavior', () => {
  it('maintains state and does not notify subscribers when goBack is called with empty history', () => {
    const machine = createChatStateMachine();
    expect(machine.historyStack).toEqual([]);
    expect(machine.currentState).toBe('WELCOME');

    const subscriber = vi.fn();
    machine.subscribe(subscriber);
    subscriber.mockClear();

    machine.goBack();

    expect(machine.currentState).toBe('WELCOME');
    expect(machine.historyStack).toEqual([]);
    expect(subscriber).not.toHaveBeenCalled();
    assertStoreParity(machine);
  });

  it('navigates to next state without modifying historyStack when recordHistory is false', () => {
    const machine = createChatStateMachine();
    machine.navigateTo('SEARCH_RESULTS');
    expect(machine.historyStack).toEqual(['WELCOME']);

    machine.navigateTo('ABOUT', { recordHistory: false });
    expect(machine.currentState).toBe('ABOUT');
    expect(machine.historyStack).toEqual(['WELCOME']);
    assertStoreParity(machine);
  });

  it('does not duplicate state in historyStack when navigating to current state', () => {
    const machine = createChatStateMachine();
    machine.navigateTo('ABOUT');
    expect(machine.historyStack).toEqual(['WELCOME']);

    machine.navigateTo('ABOUT');
    expect(machine.currentState).toBe('ABOUT');
    expect(machine.historyStack).toEqual(['WELCOME']);
    assertStoreParity(machine);
  });

  it('returns false for selectVoteById when no parliamentarian or proposal is selected', () => {
    const machine = createChatStateMachine();
    expect(machine.selectVoteById('qualquer-voto')).toBe(false);
    expect(machine.selectedVote).toBeNull();
    assertStoreParity(machine);
  });

  it('returns false for selectVoteById when proposal is selected but vote is not in voteHistory', () => {
    const machine = createChatStateMachine();
    machine.navigateTo('BILL_DETAIL', {
      updates: {
        selectedProposal: createOfficialProposal({ source: 'camara' }),
        voteHistory: [createControlledVote('camara-votacao-1', { source: 'camara' })]
      }
    });

    expect(machine.selectVoteById('camara-votacao-inexistente')).toBe(false);
    expect(machine.selectedVote).toBeNull();
    assertStoreParity(machine);
  });

  it('returns false for selectVoteById when vote source does not match selectedProposal source', () => {
    const machine = createChatStateMachine();
    machine.navigateTo('BILL_DETAIL', {
      updates: {
        selectedProposal: createOfficialProposal({ source: 'camara' }),
        voteHistory: [createControlledVote('senado-votacao-1', { source: 'senado' })]
      }
    });

    expect(machine.selectVoteById('senado-votacao-1')).toBe(false);
    expect(machine.selectedVote).toBeNull();
    assertStoreParity(machine);
  });

  it('returns false for selectVoteById when parliamentarian is selected but vote is not found', () => {
    const machine = createChatStateMachine();
    machine.navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedParliamentarian: createOfficialParliamentarian({ source: 'camara' }),
        voteHistory: [createControlledVote('camara-votacao-1', { source: 'camara' })]
      }
    });

    expect(machine.selectVoteById('voto-nao-existente')).toBe(false);
    expect(machine.selectedVote).toBeNull();
    assertStoreParity(machine);
  });

  it('returns false for selectVoteById when vote source does not match selectedParliamentarian source', () => {
    const machine = createChatStateMachine();
    machine.navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedParliamentarian: createOfficialParliamentarian({ source: 'camara' }),
        voteHistory: [createControlledVote('senado-votacao-1', { source: 'senado' })]
      }
    });

    expect(machine.selectVoteById('senado-votacao-1')).toBe(false);
    expect(machine.selectedVote).toBeNull();
    assertStoreParity(machine);
  });

  it('returns false when trying to open parliamentarian bills without a selected parliamentarian', async () => {
    const machine = createChatStateMachine();
    const result = await machine.openParliamentarianBills();
    expect(result).toBe(false);
    expect(machine.currentState).toBe('WELCOME');
    assertStoreParity(machine);
  });

  it('returns false when trying to open parliamentarian votes without a selected parliamentarian', () => {
    const machine = createChatStateMachine();
    const result = machine.openParliamentarianVotes();
    expect(result).toBe(false);
    expect(machine.currentState).toBe('WELCOME');
    assertStoreParity(machine);
  });

  it('returns false when trying to select proposal by id not present in context', async () => {
    const machine = createChatStateMachine();
    const result = await machine.selectProposalById('camara-proposicao-nao-existente');
    expect(result).toBe(false);
    expect(machine.selectedProposal).toBeNull();
    assertStoreParity(machine);
  });

  it('returns false when selecting non-official parliamentarian or non-official proposal', async () => {
    const machine = createChatStateMachine();
    machine.set({
      ...initialChatContext,
      currentState: 'SEARCH_RESULTS',
      parliamentariansFound: [
        {
          ...createOfficialParliamentarian(),
          origin: 'fixture' as const
        }
      ],
      proposalsFound: [
        {
          ...createOfficialProposal(),
          origin: 'fixture' as const
        }
      ]
    });

    const parliamentarianResult = await machine.selectParliamentarianById('camara-10');
    expect(parliamentarianResult).toBe(false);

    const proposalResult = await machine.selectProposalById('camara-proposicao-1234');
    expect(proposalResult).toBe(false);
    assertStoreParity(machine);
  });

  it('returns false when opening bills or votes for a non-official selected parliamentarian', async () => {
    const machine = createChatStateMachine();
    machine.set({
      ...initialChatContext,
      currentState: 'PARLIAMENTARIAN_DETAIL',
      selectedParliamentarian: {
        ...createOfficialParliamentarian(),
        origin: 'fixture' as const
      }
    });

    const billsResult = await machine.openParliamentarianBills();
    expect(billsResult).toBe(false);

    const votesResult = machine.openParliamentarianVotes();
    expect(votesResult).toBe(false);
    assertStoreParity(machine);
  });
});

describe('ChatStateMachine in-flight request cancellation with AbortSignal', () => {
  it('aborts previous in-flight search when a subsequent search is dispatched', async () => {
    const machine = createChatStateMachine();
    const signals: AbortSignal[] = [];

    const deferred: { resolve: (results: SearchResults) => void } = {
      resolve: () => undefined
    };
    const searchPromise1 = new Promise<SearchResults>((resolve) => {
      deferred.resolve = resolve;
    });

    const searchMock = vi.fn().mockImplementation((query: string, opts?: { signal?: AbortSignal }) => {
      if (opts?.signal) {
        signals.push(opts.signal);
      }
      if (query === 'primeira') {
        return searchPromise1;
      }
      return Promise.resolve({
        parliamentarians: [createOfficialParliamentarian({ id: 'camara-2', name: 'Segundo' })],
        proposals: []
      });
    });

    // Dispatch first search
    const exec1 = machine.executeSearch('primeira', {
      delayMs: 0,
      search: searchMock
    });

    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    // Dispatch second search while first is still in flight
    const exec2 = machine.executeSearch('segunda', {
      delayMs: 0,
      search: searchMock
    });

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    // First search finishes late
    deferred.resolve({
      parliamentarians: [createOfficialParliamentarian({ id: 'camara-1', name: 'Primeiro' })],
      proposals: []
    });

    await Promise.all([exec1, exec2]);

    expect(machine.currentState).toBe('SEARCH_RESULTS');
    expect(machine.lastQuery).toBe('segunda');
    expect(machine.parliamentariansFound[0]?.name).toBe('Segundo');
    assertStoreParity(machine);
  });

  it('aborts in-flight search and ignores cancellation silently upon reset()', async () => {
    const machine = createChatStateMachine();
    let capturedSignal: AbortSignal | undefined;

    const slowSearch = vi.fn().mockImplementation((_query: string, opts?: { signal?: AbortSignal }) => {
      capturedSignal = opts?.signal;
      return new Promise<SearchResults>((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          reject(new DOMException('A busca foi cancelada.', 'AbortError'));
        });
      });
    });

    const searchPromise = machine.executeSearch('educacao', {
      delayMs: 0,
      search: slowSearch
    });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    machine.reset();

    expect(capturedSignal?.aborted).toBe(true);
    await searchPromise;

    expect(machine.currentState).toBe('WELCOME');
    expect(machine.errorMessage).toBe('');
    assertStoreParity(machine);
  });

  it('aborts in-flight search and ignores cancellation silently upon navigateTo()', async () => {
    const machine = createChatStateMachine();
    let capturedSignal: AbortSignal | undefined;

    const slowSearch = vi.fn().mockImplementation((_query: string, opts?: { signal?: AbortSignal }) => {
      capturedSignal = opts?.signal;
      return new Promise<SearchResults>((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          reject(new DOMException('A busca foi cancelada.', 'AbortError'));
        });
      });
    });

    const searchPromise = machine.executeSearch('saude', {
      delayMs: 0,
      search: slowSearch
    });

    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);

    machine.navigateTo('ABOUT');

    expect(capturedSignal?.aborted).toBe(true);
    await searchPromise;

    expect(machine.currentState).toBe('ABOUT');
    expect(machine.errorMessage).toBe('');
    assertStoreParity(machine);
  });

  it('ignores AbortError thrown by search without transitioning to ERROR state', async () => {
    const machine = createChatStateMachine();

    await machine.executeSearch('termo', {
      delayMs: 0,
      search: async () => {
        throw new DOMException('Operação abortada.', 'AbortError');
      }
    });

    expect(machine.currentState).not.toBe('ERROR');
    expect(machine.errorMessage).toBe('');
    assertStoreParity(machine);
  });

  it('aborts in-flight search when user selects a parliamentarian or proposal', async () => {
    const initialParliamentarian = createOfficialParliamentarian({ id: 'camara-10' });
    const machine = createChatStateMachine();
    let capturedSignal: AbortSignal | undefined;

    const slowSearch = vi.fn().mockImplementation((_query: string, opts?: { signal?: AbortSignal }) => {
      capturedSignal = opts?.signal;
      return new Promise<SearchResults>((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Cancelado.', 'AbortError'));
        });
      });
    });

    const searchPromise = machine.executeSearch('consulta', {
      delayMs: 0,
      search: slowSearch
    });

    expect(capturedSignal?.aborted).toBe(false);

    machine.navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: { selectedParliamentarian: initialParliamentarian }
    });

    expect(capturedSignal?.aborted).toBe(true);
    await searchPromise;

    expect(machine.currentState).toBe('PARLIAMENTARIAN_DETAIL');
    expect(machine.selectedParliamentarian?.id).toBe('camara-10');
    assertStoreParity(machine);
  });
});
