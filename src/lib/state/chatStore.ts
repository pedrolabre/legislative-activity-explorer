import { get, writable } from 'svelte/store';
import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
import {
  getOfficialParliamentarianDetail as loadOfficialParliamentarianDetail,
  getOfficialProposalDetail as loadOfficialProposalDetail,
  getOfficialProposalsByParliamentarian as loadOfficialProposalsByParliamentarian,
  type OfficialDetailRecoverableError,
  type OfficialDetailListResult,
  type OfficialDetailResult
} from '$lib/services/officialDetailService';
import {
  getOfficialVotesByProposal as loadOfficialVotesByProposal,
  type OfficialVoteListResult,
  type OfficialVoteRecoverableError
} from '$lib/services/officialVoteService';
import {
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianSessionVotesEmptyMessage,
  officialParliamentarianStaticCoverageDescription,
  officialParliamentarianVoteHistoryUnavailableMessage,
  officialSenadoAssociatedMattersUnavailableDescription,
  officialSenadoAssociatedMattersEmptyMessage,
  officialSenadoAssociatedMattersUnavailableMessage,
  officialSenadoProposalVotesEmptyMessage,
  officialSenadoProposalVotesUnavailableMessage,
  officialSenadoStaticCoverageDescription
} from '$lib/ui/officialMessages';
import { getRecoverableStatusNotice, joinRecoverableNotices } from '$lib/services/officialNotices';
import { searchPublicRecords } from '$lib/services/publicSearchService';
import { emptySearchResults, type SearchResults } from '$lib/services/searchResults';

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
  getOfficialProposalDetail?: (
    proposal: LegislativeProposal
  ) => Promise<OfficialDetailResult<LegislativeProposal>>;
  getOfficialVotesByProposal?: (
    proposal: LegislativeProposal
  ) => Promise<OfficialVoteListResult<RollCallVote>>;
}

export interface SelectParliamentarianByIdOptions {
  getOfficialParliamentarianDetail?: (
    parliamentarian: Parliamentarian
  ) => Promise<OfficialDetailResult<Parliamentarian>>;
}

export interface OpenParliamentarianBillsOptions {
  getOfficialProposalsByParliamentarian?: (
    parliamentarian: Parliamentarian
  ) => Promise<OfficialDetailListResult<LegislativeProposal>>;
}

export interface SelectProposalByIdOptions {
  getOfficialProposalDetail?: (
    proposal: LegislativeProposal
  ) => Promise<OfficialDetailResult<LegislativeProposal>>;
  getOfficialVotesByProposal?: (
    proposal: LegislativeProposal
  ) => Promise<OfficialVoteListResult<RollCallVote>>;
}

const defaultSearchDelayMs = 450;
const genericSearchErrorMessage = 'Não foi possível concluir a busca nesta página.';

export {
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianSessionVotesEmptyMessage,
  officialParliamentarianStaticCoverageDescription,
  officialParliamentarianVoteHistoryUnavailableMessage,
  officialSenadoAssociatedMattersUnavailableDescription,
  officialSenadoAssociatedMattersEmptyMessage,
  officialSenadoAssociatedMattersUnavailableMessage,
  officialSenadoProposalVotesEmptyMessage,
  officialSenadoProposalVotesUnavailableMessage,
  officialSenadoStaticCoverageDescription
};

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
    errorMessage: results.recoverableMessage?.trim() ?? ''
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

function applyDirectProposalSearchResult(
  context: ChatContext,
  query: string,
  results: SearchResults,
  proposal: LegislativeProposal,
  voteHistory: RollCallVote[],
  detailNotice: string
): ChatContext {
  const errorMessage = joinRecoverableNotices(
    results.recoverableMessage?.trim() ?? '',
    detailNotice
  );
  const nextContext = {
    ...context,
    lastQuery: query,
    parliamentariansFound: results.parliamentarians,
    proposalsFound: results.proposals,
    selectedParliamentarian: null,
    parliamentarianProposals: [],
    selectedProposal: proposal,
    selectedVote: null,
    voteHistory,
    errorMessage
  };

  if (context.currentState === 'ABOUT') {
    const nextHistoryStack =
      context.historyStack.length > 0
        ? [...context.historyStack.slice(0, -1), 'BILL_DETAIL' as UIState]
        : ['BILL_DETAIL' as UIState];

    return {
      ...nextContext,
      currentState: 'ABOUT',
      historyStack: nextHistoryStack
    };
  }

  return {
    ...nextContext,
    currentState: 'BILL_DETAIL'
  };
}

function isOfficialParliamentarian(parliamentarian: Parliamentarian) {
  return parliamentarian.origin === 'official';
}

export function hasOfficialParliamentarianIdPattern(id: string) {
  return /^camara-(?!proposicao-).+/.test(id) || /^senado-(?!materia-|processo-).+/.test(id);
}

function isOfficialProposal(proposal: LegislativeProposal) {
  return proposal.origin === 'official';
}

export function hasOfficialProposalIdPattern(id: string) {
  return (
    /^camara-proposicao-.+/.test(id) ||
    /^senado-materia-.+/.test(id) ||
    /^senado-processo-.+/.test(id)
  );
}

function mergeDefinedFields<T extends object>(base: T, detail: T): T {
  const merged = { ...base };

  for (const key of Object.keys(detail) as Array<keyof T>) {
    const value = detail[key];

    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

function findParliamentarianInContext(context: ChatContext, id: string) {
  return (
    context.parliamentariansFound.find((parliamentarian) => parliamentarian.id === id) ?? null
  );
}

function findProposalInContext(context: ChatContext, id: string) {
  return (
    context.parliamentarianProposals.find((proposal) => proposal.id === id) ??
    context.proposalsFound.find((proposal) => proposal.id === id) ??
    null
  );
}

function findVoteInContext(context: ChatContext, id: string) {
  return context.voteHistory.find((vote) => vote.id === id) ?? null;
}

function getOfficialDetailNotice(
  status: OfficialDetailResult<unknown>['status'] | OfficialDetailListResult<unknown>['status'],
  label: string,
  errors: OfficialDetailRecoverableError[] = []
) {
  return getRecoverableStatusNotice(status, label, errors);
}

function getOfficialVoteNotice(
  status: OfficialVoteListResult<unknown>['status'],
  label: string,
  errors: OfficialVoteRecoverableError[] = []
) {
  return getRecoverableStatusNotice(status, label, errors);
}

async function loadProposalOfficialDetail(
  controlledProposal: LegislativeProposal,
  options: Pick<SelectProposalByIdOptions, 'getOfficialProposalDetail' | 'getOfficialVotesByProposal'>,
  includeOfficialVotes: boolean
) {
  let proposal = controlledProposal;
  let voteHistory: RollCallVote[] = [];
  let errorMessage = '';

  if (!isOfficialProposal(controlledProposal)) {
    return {
      proposal,
      voteHistory,
      errorMessage
    };
  }

  const officialResult = await (options.getOfficialProposalDetail ?? loadOfficialProposalDetail)(
    controlledProposal
  );

  proposal = officialResult.data
    ? mergeDefinedFields(controlledProposal, officialResult.data)
    : controlledProposal;
  const proposalNotice = getOfficialDetailNotice(officialResult.status, 'proposição');
  let proposalVotesNotice = '';

  if (includeOfficialVotes && isOfficialProposal(proposal)) {
    const officialVoteResult = await (options.getOfficialVotesByProposal ??
      loadOfficialVotesByProposal)(proposal);

    voteHistory = officialVoteResult.data;
    proposalVotesNotice = getOfficialVoteNotice(
      officialVoteResult.status,
      'votações da proposição',
      officialVoteResult.errors
    );
  }

  errorMessage = joinRecoverableNotices(proposalNotice, proposalVotesNotice);

  return {
    proposal,
    voteHistory,
    errorMessage
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
  const search = options.search ?? searchPublicRecords;
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

          if (results.directProposal && isOfficialProposal(results.directProposal)) {
            const directProposalDetail = await loadProposalOfficialDetail(
              results.directProposal,
              options,
              true
            );

            if (currentSearchId !== searchSequence) {
              resolve();
              return;
            }

            chatStore.update((context) =>
              applyDirectProposalSearchResult(
                context,
                normalizedQuery,
                results,
                directProposalDetail.proposal,
                directProposalDetail.voteHistory,
                directProposalDetail.errorMessage
              )
            );
          } else {
            chatStore.update((context) => applySearchResults(context, normalizedQuery, results));
          }
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
  const contextParliamentarian = findParliamentarianInContext(context, id);

  if (!contextParliamentarian || !isOfficialParliamentarian(contextParliamentarian)) {
    return false;
  }

  const officialResult = await (options.getOfficialParliamentarianDetail ??
    loadOfficialParliamentarianDetail)(contextParliamentarian);

  const parliamentarian = officialResult.data
    ? mergeDefinedFields(contextParliamentarian, officialResult.data)
    : contextParliamentarian;
  const errorMessage = getOfficialDetailNotice(officialResult.status, 'parlamentar');

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

  if (!isOfficialParliamentarian(context.selectedParliamentarian)) {
    return false;
  }

  const officialResult = await (options.getOfficialProposalsByParliamentarian ??
    loadOfficialProposalsByParliamentarian)(context.selectedParliamentarian);

  parliamentarianProposals = officialResult.data;
  errorMessage = getOfficialDetailNotice(
    officialResult.status,
    'proposições associadas',
    officialResult.errors
  );

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

  if (!isOfficialParliamentarian(context.selectedParliamentarian)) {
    return false;
  }

  const voteHistory = context.voteHistory.filter(
    (vote) => vote.source === context.selectedParliamentarian?.source
  );
  const errorMessage =
    voteHistory.length > 0
      ? joinRecoverableNotices(
          officialParliamentarianVoteHistoryUnavailableMessage,
          officialParliamentarianSessionVotesCoverageMessage
        )
      : officialParliamentarianVoteHistoryUnavailableMessage;

  navigateTo('PARLIAMENTARIAN_VOTES', {
    updates: {
      voteHistory,
      selectedProposal: null,
      selectedVote: null,
      errorMessage
    }
  });

  return true;
}

export async function selectProposalById(id: string, options: SelectProposalByIdOptions = {}) {
  const context = get(chatStore);
  const contextProposal = findProposalInContext(context, id);

  if (!contextProposal || !isOfficialProposal(contextProposal)) {
    return false;
  }

  const proposalDetail = await loadProposalOfficialDetail(contextProposal, options, true);
  const proposal = proposalDetail.proposal;
  const errorMessage = proposalDetail.errorMessage;
  const voteHistory = proposalDetail.voteHistory;

  navigateTo('BILL_DETAIL', {
    updates: {
      selectedProposal: proposal,
      selectedVote: null,
      voteHistory,
      errorMessage
    }
  });

  return true;
}

export function selectVoteById(id: string) {
  const context = get(chatStore);
  const selectedParliamentarian = context.selectedParliamentarian;
  const selectedProposal = context.selectedProposal;
  const contextVote = findVoteInContext(context, id);

  if (!selectedParliamentarian) {
    if (
      !selectedProposal ||
      !isOfficialProposal(selectedProposal) ||
      !contextVote ||
      contextVote.source !== selectedProposal.source
    ) {
      return false;
    }

    navigateTo('BILL_VOTES', {
      updates: {
        selectedVote: contextVote,
        errorMessage: ''
      }
    });

    return true;
  }

  if (!isOfficialParliamentarian(selectedParliamentarian)) {
    return false;
  }

  if (!contextVote || contextVote.source !== selectedParliamentarian.source) {
    return false;
  }

  navigateTo('BILL_VOTES', {
    updates: {
      selectedVote: contextVote,
      errorMessage: ''
    }
  });

  return true;
}
