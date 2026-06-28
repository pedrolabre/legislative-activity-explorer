import { get, writable } from 'svelte/store';
import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
import { getParliamentarianById } from '$lib/services/parliamentarianService';
import {
  getProposalByIdForParliamentarian,
  getProposalsByParliamentarianId
} from '$lib/services/proposalService';
import {
  emptySearchResults,
  searchInitialRecords,
  type SearchResults
} from '$lib/services/searchService';
import {
  getVoteByIdForParliamentarian,
  getVotesByParliamentarianId
} from '$lib/services/voteService';

export interface ChatContext {
  currentState: UIState;
  historyStack: UIState[];
  lastQuery: string;
  parliamentariansFound: Parliamentarian[];
  proposalsFound: LegislativeProposal[];
  selectedParliamentarian: Parliamentarian | null;
  parliamentarianProposals: LegislativeProposal[];
  selectedProposal: LegislativeProposal | null;
  selectedVote: RollCallVote | null;
  voteHistory: RollCallVote[];
  errorMessage: string;
}

export type ChatContextPatch = Partial<Omit<ChatContext, 'currentState' | 'historyStack'>>;

export interface NavigateToOptions {
  updates?: ChatContextPatch;
  recordHistory?: boolean;
}

export interface ExecuteSearchOptions {
  delayMs?: number;
  search?: (query: string) => SearchResults;
}

const defaultSearchDelayMs = 450;
const genericSearchErrorMessage = 'Não foi possível concluir a busca nesta página.';

let searchSequence = 0;
let pendingSearch:
  | {
      timeoutId: ReturnType<typeof setTimeout> | null;
      resolve: () => void;
    }
  | null = null;

function createInitialChatContext(): ChatContext {
  return {
    currentState: 'WELCOME',
    historyStack: [],
    lastQuery: '',
    parliamentariansFound: [],
    proposalsFound: [],
    selectedParliamentarian: null,
    parliamentarianProposals: [],
    selectedProposal: null,
    selectedVote: null,
    voteHistory: [],
    errorMessage: ''
  };
}

export const initialChatContext = createInitialChatContext();

export const chatStore = writable<ChatContext>(createInitialChatContext());

function cancelPendingSearch() {
  if (!pendingSearch) {
    return;
  }

  if (pendingSearch.timeoutId) {
    clearTimeout(pendingSearch.timeoutId);
  }

  pendingSearch.resolve();
  pendingSearch = null;
}

function applySearchResults(context: ChatContext, query: string, results: SearchResults): ChatContext {
  const nextContext = {
    ...context,
    lastQuery: query,
    parliamentariansFound: results.parliamentarians,
    proposalsFound: results.proposals,
    selectedParliamentarian: null,
    parliamentarianProposals: [],
    selectedProposal: null,
    selectedVote: null,
    voteHistory: [],
    errorMessage: ''
  };

  if (context.currentState === 'ABOUT') {
    const nextHistoryStack =
      context.historyStack.length > 0
        ? [...context.historyStack.slice(0, -1), 'SEARCH_RESULTS' as UIState]
        : ['SEARCH_RESULTS' as UIState];

    return {
      ...nextContext,
      currentState: 'ABOUT',
      historyStack: nextHistoryStack
    };
  }

  return {
    ...nextContext,
    currentState: 'SEARCH_RESULTS'
  };
}

export function navigateTo(nextState: UIState, options: NavigateToOptions = {}) {
  const { updates = {}, recordHistory = true } = options;

  chatStore.update((context) => {
    const shouldRecordHistory = recordHistory && context.currentState !== nextState;

    return {
      ...context,
      ...updates,
      currentState: nextState,
      historyStack: shouldRecordHistory
        ? [...context.historyStack, context.currentState]
        : context.historyStack
    };
  });
}

export function goBack() {
  chatStore.update((context) => {
    if (context.historyStack.length === 0) {
      return context;
    }

    const historyStack = [...context.historyStack];
    const previousState = historyStack.pop() as UIState;

    return {
      ...context,
      currentState: previousState,
      historyStack
    };
  });
}

export function reset() {
  searchSequence += 1;
  cancelPendingSearch();
  chatStore.set(createInitialChatContext());
}

export async function executeSearch(query: string, options: ExecuteSearchOptions = {}) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return;
  }

  cancelPendingSearch();
  const currentSearchId = ++searchSequence;
  const search = options.search ?? searchInitialRecords;
  const delayMs = options.delayMs ?? defaultSearchDelayMs;

  chatStore.update((context) => ({
    ...context,
    currentState: 'SEARCHING',
    historyStack: [],
    lastQuery: normalizedQuery,
    parliamentariansFound: emptySearchResults.parliamentarians,
    proposalsFound: emptySearchResults.proposals,
    selectedParliamentarian: null,
    parliamentarianProposals: [],
    selectedProposal: null,
    selectedVote: null,
    voteHistory: [],
    errorMessage: ''
  }));

  await new Promise<void>((resolve) => {
    const completeSearch = () => {
      if (currentSearchId !== searchSequence) {
        resolve();
        return;
      }

      try {
        const results = search(normalizedQuery);
        chatStore.update((context) => applySearchResults(context, normalizedQuery, results));
      } catch {
        chatStore.update((context) => ({
          ...context,
          currentState: 'ERROR',
          errorMessage: genericSearchErrorMessage
        }));
      } finally {
        if (pendingSearch?.resolve === resolve) {
          pendingSearch = null;
        }

        resolve();
      }
    };

    if (delayMs <= 0) {
      completeSearch();
      return;
    }

    pendingSearch = {
      timeoutId: setTimeout(completeSearch, delayMs),
      resolve
    };
  });
}

export function selectParliamentarianById(id: string) {
  const parliamentarian = getParliamentarianById(id);

  if (!parliamentarian) {
    return false;
  }

  navigateTo('PARLIAMENTARIAN_DETAIL', {
    updates: {
      selectedParliamentarian: parliamentarian,
      parliamentarianProposals: [],
      selectedProposal: null,
      selectedVote: null,
      voteHistory: []
    }
  });

  return true;
}

export function openParliamentarianBills() {
  const context = get(chatStore);

  if (!context.selectedParliamentarian) {
    return false;
  }

  navigateTo('PARLIAMENTARIAN_BILLS', {
    updates: {
      parliamentarianProposals: getProposalsByParliamentarianId(context.selectedParliamentarian.id),
      selectedProposal: null,
      selectedVote: null
    }
  });

  return true;
}

export function openParliamentarianVotes() {
  const context = get(chatStore);

  if (!context.selectedParliamentarian) {
    return false;
  }

  navigateTo('PARLIAMENTARIAN_VOTES', {
    updates: {
      voteHistory: getVotesByParliamentarianId(context.selectedParliamentarian.id),
      selectedProposal: null,
      selectedVote: null
    }
  });

  return true;
}

export function selectProposalById(id: string) {
  const context = get(chatStore);
  const selectedParliamentarianId = context.selectedParliamentarian?.id;

  if (!selectedParliamentarianId) {
    return false;
  }

  const proposal = getProposalByIdForParliamentarian(id, selectedParliamentarianId);

  if (!proposal) {
    return false;
  }

  navigateTo('BILL_DETAIL', {
    updates: {
      selectedProposal: proposal,
      selectedVote: null
    }
  });

  return true;
}

export function selectVoteById(id: string) {
  const context = get(chatStore);
  const selectedParliamentarianId = context.selectedParliamentarian?.id;

  if (!selectedParliamentarianId) {
    return false;
  }

  const vote = getVoteByIdForParliamentarian(id, selectedParliamentarianId);

  if (!vote) {
    return false;
  }

  navigateTo('BILL_VOTES', {
    updates: {
      selectedProposal: null,
      selectedVote: vote
    }
  });

  return true;
}
