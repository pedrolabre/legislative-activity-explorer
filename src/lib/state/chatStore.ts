import { get, writable } from 'svelte/store';
import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
import {
  getOfficialParliamentarianDetail as loadOfficialParliamentarianDetail,
  getOfficialProposalDetail as loadOfficialProposalDetail,
  getOfficialProposalsByParliamentarian as loadOfficialProposalsByParliamentarian,
  type OfficialDetailListResult,
  type OfficialDetailResult
} from '$lib/services/officialDetailService';
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
  search?: (query: string) => SearchResults | Promise<SearchResults>;
}

export interface SelectParliamentarianByIdOptions {
  getFixtureParliamentarianById?: (id: string) => Parliamentarian | null;
  getOfficialParliamentarianDetail?: (
    parliamentarian: Parliamentarian
  ) => Promise<OfficialDetailResult<Parliamentarian>>;
}

export interface OpenParliamentarianBillsOptions {
  getFixtureProposalsByParliamentarianId?: (parliamentarianId: string) => LegislativeProposal[];
  getOfficialProposalsByParliamentarian?: (
    parliamentarian: Parliamentarian
  ) => Promise<OfficialDetailListResult<LegislativeProposal>>;
}

export interface SelectProposalByIdOptions {
  getFixtureProposalByIdForParliamentarian?: (
    id: string,
    parliamentarianId: string
  ) => LegislativeProposal | null;
  getOfficialProposalDetail?: (
    proposal: LegislativeProposal
  ) => Promise<OfficialDetailResult<LegislativeProposal>>;
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

function isOfficialParliamentarian(parliamentarian: Parliamentarian) {
  return parliamentarian.id === `${parliamentarian.source}-${parliamentarian.sourceId}`;
}

function isOfficialProposal(proposal: LegislativeProposal) {
  if (proposal.source === 'camara') {
    return proposal.id === `camara-proposicao-${proposal.sourceId}`;
  }

  return proposal.id === `senado-materia-${proposal.sourceId}`;
}

function findParliamentarianInContext(context: ChatContext, id: string) {
  return (
    context.parliamentariansFound.find((parliamentarian) => parliamentarian.id === id) ?? null
  );
}

function findProposalInContext(context: ChatContext, id: string) {
  return context.parliamentarianProposals.find((proposal) => proposal.id === id) ?? null;
}

function getOfficialDetailNotice(
  status: OfficialDetailResult<unknown>['status'] | OfficialDetailListResult<unknown>['status'],
  label: string
) {
  if (status === 'fulfilled') {
    return '';
  }

  if (status === 'partial') {
    return `Parte dos dados oficiais de ${label} não pode ser exibida nesta consulta.`;
  }

  if (status === 'unavailable') {
    return `Dados oficiais de ${label} não estão disponíveis nesta consulta.`;
  }

  return `Dados oficiais de ${label} não puderam ser carregados neste momento.`;
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
      void (async () => {
        if (currentSearchId !== searchSequence) {
          resolve();
          return;
        }

        try {
          const results = await search(normalizedQuery);

          if (currentSearchId !== searchSequence) {
            resolve();
            return;
          }

          chatStore.update((context) => applySearchResults(context, normalizedQuery, results));
        } catch {
          if (currentSearchId !== searchSequence) {
            return;
          }

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
      })();
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

export async function selectParliamentarianById(
  id: string,
  options: SelectParliamentarianByIdOptions = {}
) {
  const context = get(chatStore);
  const fixtureLoader = options.getFixtureParliamentarianById ?? getParliamentarianById;
  const contextParliamentarian = findParliamentarianInContext(context, id);
  const fixtureParliamentarian = fixtureLoader(id);
  const baseParliamentarian =
    contextParliamentarian && isOfficialParliamentarian(contextParliamentarian)
      ? contextParliamentarian
      : fixtureParliamentarian ?? contextParliamentarian;

  if (!baseParliamentarian) {
    return false;
  }

  let parliamentarian = baseParliamentarian;
  let errorMessage = '';

  if (isOfficialParliamentarian(baseParliamentarian)) {
    const officialResult = await (options.getOfficialParliamentarianDetail ??
      loadOfficialParliamentarianDetail)(baseParliamentarian);

    parliamentarian = officialResult.data ?? baseParliamentarian;
    errorMessage = getOfficialDetailNotice(officialResult.status, 'parlamentar');
  }

  navigateTo('PARLIAMENTARIAN_DETAIL', {
    updates: {
      selectedParliamentarian: parliamentarian,
      parliamentarianProposals: [],
      selectedProposal: null,
      selectedVote: null,
      voteHistory: [],
      errorMessage
    }
  });

  return true;
}

export async function openParliamentarianBills(options: OpenParliamentarianBillsOptions = {}) {
  const context = get(chatStore);

  if (!context.selectedParliamentarian) {
    return false;
  }

  let parliamentarianProposals: LegislativeProposal[];
  let errorMessage = '';

  if (isOfficialParliamentarian(context.selectedParliamentarian)) {
    const officialResult = await (options.getOfficialProposalsByParliamentarian ??
      loadOfficialProposalsByParliamentarian)(context.selectedParliamentarian);

    parliamentarianProposals = officialResult.data;
    errorMessage = getOfficialDetailNotice(officialResult.status, 'proposições associadas');
  } else {
    const fixtureLoader =
      options.getFixtureProposalsByParliamentarianId ?? getProposalsByParliamentarianId;

    parliamentarianProposals = fixtureLoader(context.selectedParliamentarian.id);
  }

  navigateTo('PARLIAMENTARIAN_BILLS', {
    updates: {
      parliamentarianProposals,
      selectedProposal: null,
      selectedVote: null,
      errorMessage
    }
  });

  return true;
}

export function openParliamentarianVotes() {
  const context = get(chatStore);

  if (!context.selectedParliamentarian) {
    return false;
  }

  const isOfficialSelection = isOfficialParliamentarian(context.selectedParliamentarian);

  navigateTo('PARLIAMENTARIAN_VOTES', {
    updates: {
      voteHistory: isOfficialSelection
        ? []
        : getVotesByParliamentarianId(context.selectedParliamentarian.id),
      selectedProposal: null,
      selectedVote: null,
      errorMessage: isOfficialSelection
        ? 'Dados oficiais de votações não estão disponíveis nesta consulta.'
        : ''
    }
  });

  return true;
}

export async function selectProposalById(id: string, options: SelectProposalByIdOptions = {}) {
  const context = get(chatStore);
  const selectedParliamentarianId = context.selectedParliamentarian?.id;

  if (!selectedParliamentarianId) {
    return false;
  }

  const fixtureLoader =
    options.getFixtureProposalByIdForParliamentarian ?? getProposalByIdForParliamentarian;
  const contextProposal = findProposalInContext(context, id);
  const fixtureProposal = fixtureLoader(id, selectedParliamentarianId);
  const baseProposal =
    contextProposal && isOfficialProposal(contextProposal)
      ? contextProposal
      : fixtureProposal ?? contextProposal;

  if (!baseProposal) {
    return false;
  }

  let proposal = baseProposal;
  let errorMessage = '';

  if (isOfficialProposal(baseProposal)) {
    const officialResult = await (options.getOfficialProposalDetail ?? loadOfficialProposalDetail)(
      baseProposal
    );

    proposal = officialResult.data
      ? {
          ...officialResult.data,
          relationship: baseProposal.relationship ?? officialResult.data.relationship
        }
      : baseProposal;
    errorMessage = getOfficialDetailNotice(officialResult.status, 'proposição');
  }

  navigateTo('BILL_DETAIL', {
    updates: {
      selectedProposal: proposal,
      selectedVote: null,
      errorMessage
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
      selectedVote: vote,
      errorMessage: ''
    }
  });

  return true;
}
