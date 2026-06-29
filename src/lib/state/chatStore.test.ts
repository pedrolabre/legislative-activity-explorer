import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  chatStore,
  executeSearch,
  goBack,
  initialChatContext,
  navigateTo,
  openParliamentarianBills,
  openParliamentarianVotes,
  reset,
  selectParliamentarianById,
  selectProposalById,
  selectVoteById
} from './chatStore';

describe('chatStore actions', () => {
  beforeEach(() => {
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

  it('routes a search with no matches to an empty result state', async () => {
    await executeSearch('termo sem fixture', { delayMs: 0 });

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
    await executeSearch('educacao', { delayMs: 0 });

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
    await executeSearch('ana', { delayMs: 0 });

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
    await executeSearch('PEC 45', { delayMs: 0 });

    const context = get(chatStore);

    expect(context.currentState).toBe('SEARCH_RESULTS');
    expect(context.lastQuery).toBe('PEC 45');
    expect(context.parliamentariansFound).toEqual([]);
    expect(context.proposalsFound.map((proposal) => proposal.title)).toEqual(['PEC 45/2023']);
    expect(context.selectedProposal).toBeNull();
  });

  it('resets search results and selections to a new initial context', async () => {
    await executeSearch('ana', { delayMs: 0 });
    selectParliamentarianById('parliamentarian-ana-costa');
    openParliamentarianBills();
    selectProposalById('bill-pl-1234-2024');

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
    await executeSearch('ana', { delayMs: 0 });

    expect(selectParliamentarianById('parliamentarian-ana-costa')).toBe(true);

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

    expect(openParliamentarianBills()).toBe(true);

    const billsContext = get(chatStore);

    expect(billsContext.currentState).toBe('PARLIAMENTARIAN_BILLS');
    expect(billsContext.parliamentarianProposals.map((proposal) => proposal.title)).toEqual([
      'PL 220/2025',
      'PL 1234/2024'
    ]);
    expect(billsContext.selectedProposal).toBeNull();
    expect(billsContext.selectedVote).toBeNull();

    expect(selectProposalById('bill-pl-1234-2024')).toBe(true);

    const proposalContext = get(chatStore);

    expect(proposalContext.currentState).toBe('BILL_DETAIL');
    expect(proposalContext.selectedParliamentarian?.name).toBe('Ana Costa');
    expect(proposalContext.selectedProposal?.title).toBe('PL 1234/2024');
    expect(proposalContext.selectedVote).toBeNull();
  });

  it('returns through the deterministic history stack', async () => {
    await executeSearch('ana', { delayMs: 0 });

    selectParliamentarianById('parliamentarian-ana-costa');
    openParliamentarianBills();
    selectProposalById('bill-pl-1234-2024');

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

  it('opens associated votes and selects a vote through guided actions', async () => {
    await executeSearch('ana', { delayMs: 0 });

    expect(selectParliamentarianById('parliamentarian-ana-costa')).toBe(true);
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
});
