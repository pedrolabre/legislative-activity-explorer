import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  chatStore,
  executeSearch,
  goBack,
  initialChatContext,
  navigateTo,
  openParliamentarianBills,
  reset,
  selectParliamentarianById,
  selectProposalById
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

  it('executes a fixture-backed search without persistence', async () => {
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

  it('resets search results and selections to a new initial context', async () => {
    await executeSearch('ana', { delayMs: 0 });
    selectParliamentarianById('parliamentarian-ana-costa');

    reset();

    const context = get(chatStore);

    expect(context).toEqual(initialChatContext);
    expect(context).not.toBe(initialChatContext);
  });

  it('records a neutral recoverable error when search execution fails', async () => {
    await executeSearch('ana', {
      delayMs: 0,
      findResults: () => {
        throw new Error('controlled failure');
      }
    });

    expect(get(chatStore)).toMatchObject({
      currentState: 'ERROR',
      errorMessage: 'Não foi possível concluir a busca nesta página.'
    });
  });

  it('selects a parliamentarian and a proposal through guided actions', async () => {
    await executeSearch('ana', { delayMs: 0 });

    expect(selectParliamentarianById('parliamentarian-ana-costa')).toBe(true);
    expect(openParliamentarianBills()).toBe(true);
    expect(selectProposalById('bill-pl-1234-2024')).toBe(true);

    const context = get(chatStore);

    expect(context.currentState).toBe('BILL_DETAIL');
    expect(context.selectedParliamentarian?.name).toBe('Ana Costa');
    expect(context.selectedProposal?.title).toBe('PL 1234/2024');
    expect(context.selectedVote).toBeNull();
  });
});
