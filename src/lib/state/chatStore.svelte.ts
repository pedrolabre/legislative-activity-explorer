import { SvelteSet } from 'svelte/reactivity';
import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
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
import { emptySearchResults } from '$lib/services/searchResults';
import type {
  ChatContext,
  ChatContextPatch,
  NavigateToOptions,
  ExecuteSearchOptions,
  SelectParliamentarianByIdOptions,
  OpenParliamentarianBillsOptions,
  SelectProposalByIdOptions
} from './chatStoreTypes';
import {
  applyDirectProposalSearchResult,
  applySearchResults,
  createInitialChatContext,
  defaultSearchDelayMs,
  hasOfficialParliamentarianIdPattern,
  hasOfficialProposalIdPattern,
  initialChatContext
} from './chatStoreHelpers';
import {
  executeOpenParliamentarianBills,
  executeOpenParliamentarianVotes,
  executeSearchOperation,
  executeSelectParliamentarian,
  executeSelectProposal,
  executeSelectVote
} from './chatStoreOperations';

export type {
  ChatContext,
  ChatContextPatch,
  NavigateToOptions,
  ExecuteSearchOptions,
  SelectParliamentarianByIdOptions,
  OpenParliamentarianBillsOptions,
  SelectProposalByIdOptions
};

export {
  createInitialChatContext,
  initialChatContext,
  hasOfficialParliamentarianIdPattern,
  hasOfficialProposalIdPattern,
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

export class ChatStateMachine {
  #context = $state<ChatContext>(createInitialChatContext());
  #subscribers = new SvelteSet<(context: ChatContext) => void>();
  #searchSequence = 0;
  #searchAbortController: AbortController | null = null;
  #pendingSearch: {
    timeoutId: ReturnType<typeof setTimeout> | null;
    resolve: () => void;
  } | null = null;

  constructor(initialContext?: ChatContext) {
    if (initialContext) {
      this.#context = { ...initialContext };
    }
  }

  get context(): ChatContext {
    return this.#context;
  }

  get currentState(): UIState {
    return this.#context.currentState;
  }

  get historyStack(): UIState[] {
    return this.#context.historyStack;
  }

  get lastQuery(): string {
    return this.#context.lastQuery;
  }

  get parliamentariansFound(): Parliamentarian[] {
    return this.#context.parliamentariansFound;
  }

  get proposalsFound(): LegislativeProposal[] {
    return this.#context.proposalsFound;
  }

  get selectedParliamentarian(): Parliamentarian | null {
    return this.#context.selectedParliamentarian;
  }

  get parliamentarianProposals(): LegislativeProposal[] {
    return this.#context.parliamentarianProposals;
  }

  get selectedProposal(): LegislativeProposal | null {
    return this.#context.selectedProposal;
  }

  get selectedVote(): RollCallVote | null {
    return this.#context.selectedVote;
  }

  get voteHistory(): RollCallVote[] {
    return this.#context.voteHistory;
  }

  get errorMessage(): string {
    return this.#context.errorMessage;
  }

  #notifySubscribers(): void {
    for (const subscriber of this.#subscribers) {
      subscriber(this.#context);
    }
  }

  #cancelPendingSearch(): void {
    if (this.#searchAbortController) {
      this.#searchAbortController.abort();
      this.#searchAbortController = null;
    }

    if (!this.#pendingSearch) {
      return;
    }

    if (this.#pendingSearch.timeoutId) {
      clearTimeout(this.#pendingSearch.timeoutId);
    }

    this.#pendingSearch.resolve();
    this.#pendingSearch = null;
  }

  subscribe(run: (context: ChatContext) => void): () => void {
    run(this.#context);
    this.#subscribers.add(run);
    return () => {
      this.#subscribers.delete(run);
    };
  }

  set(value: ChatContext): void {
    this.#context = value;
    this.#notifySubscribers();
  }

  update(updater: (context: ChatContext) => ChatContext): void {
    this.#context = updater(this.#context);
    this.#notifySubscribers();
  }

  navigateTo(nextState: UIState, options: NavigateToOptions = {}): void {
    this.#cancelPendingSearch();
    const { updates = {}, recordHistory = true } = options;
    const shouldRecordHistory = recordHistory && this.#context.currentState !== nextState;

    this.#context = {
      ...this.#context,
      ...updates,
      currentState: nextState,
      historyStack: shouldRecordHistory
        ? [...this.#context.historyStack, this.#context.currentState]
        : this.#context.historyStack
    };
    this.#notifySubscribers();
  }

  goBack(): void {
    if (this.#context.historyStack.length === 0) {
      return;
    }

    this.#cancelPendingSearch();
    const historyStack = [...this.#context.historyStack];
    const previousState = historyStack.pop() as UIState;

    this.#context = {
      ...this.#context,
      currentState: previousState,
      historyStack
    };
    this.#notifySubscribers();
  }

  reset(): void {
    this.#searchSequence += 1;
    this.#cancelPendingSearch();
    this.#context = createInitialChatContext();
    this.#notifySubscribers();
  }

  async executeSearch(query: string, options: ExecuteSearchOptions = {}): Promise<void> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    this.#cancelPendingSearch();
    const currentSearchId = ++this.#searchSequence;
    const searchController = new AbortController();
    this.#searchAbortController = searchController;
    const delayMs = options.delayMs ?? defaultSearchDelayMs;

    this.#context = {
      ...this.#context,
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
    };
    this.#notifySubscribers();

    await new Promise<void>((resolve) => {
      const completeSearch = () => {
        void (async () => {
          if (currentSearchId !== this.#searchSequence || searchController.signal.aborted) {
            resolve();
            return;
          }

          const opResult = await executeSearchOperation(
            normalizedQuery,
            options,
            searchController.signal
          );

          if (currentSearchId !== this.#searchSequence || searchController.signal.aborted) {
            resolve();
            return;
          }

          if (opResult.kind === 'direct-proposal') {
            this.#context = applyDirectProposalSearchResult(
              this.#context,
              normalizedQuery,
              opResult.results,
              opResult.proposal,
              opResult.voteHistory,
              opResult.detailNotice
            );
            this.#notifySubscribers();
          } else if (opResult.kind === 'standard') {
            this.#context = applySearchResults(this.#context, normalizedQuery, opResult.results);
            this.#notifySubscribers();
          } else if (opResult.kind === 'error') {
            this.#context = {
              ...this.#context,
              currentState: 'ERROR',
              errorMessage: opResult.message
            };
            this.#notifySubscribers();
          }

          if (this.#pendingSearch?.resolve === resolve) {
            this.#pendingSearch = null;
          }
          if (this.#searchAbortController === searchController) {
            this.#searchAbortController = null;
          }

          resolve();
        })();
      };

      if (delayMs <= 0) {
        completeSearch();
        return;
      }

      this.#pendingSearch = {
        timeoutId: setTimeout(completeSearch, delayMs),
        resolve
      };
    });
  }

  async selectParliamentarianById(
    id: string,
    options: SelectParliamentarianByIdOptions = {}
  ): Promise<boolean> {
    this.#cancelPendingSearch();
    const result = await executeSelectParliamentarian(this.#context, id, options);
    if (!result) {
      return false;
    }

    this.navigateTo('PARLIAMENTARIAN_DETAIL', result);
    return true;
  }

  async openParliamentarianBills(
    options: OpenParliamentarianBillsOptions = {}
  ): Promise<boolean> {
    this.#cancelPendingSearch();
    const result = await executeOpenParliamentarianBills(this.#context, options);
    if (!result) {
      return false;
    }

    this.navigateTo('PARLIAMENTARIAN_BILLS', result);
    return true;
  }

  openParliamentarianVotes(): boolean {
    this.#cancelPendingSearch();
    const result = executeOpenParliamentarianVotes(this.#context);
    if (!result) {
      return false;
    }

    this.navigateTo('PARLIAMENTARIAN_VOTES', result);
    return true;
  }

  async selectProposalById(
    id: string,
    options: SelectProposalByIdOptions = {}
  ): Promise<boolean> {
    this.#cancelPendingSearch();
    const result = await executeSelectProposal(this.#context, id, options);
    if (!result) {
      return false;
    }

    this.navigateTo('BILL_DETAIL', result);
    return true;
  }

  selectVoteById(id: string): boolean {
    const result = executeSelectVote(this.#context, id);
    if (!result) {
      return false;
    }

    this.navigateTo('BILL_VOTES', result);
    return true;
  }
}

export function createChatStateMachine(initialContext?: ChatContext): ChatStateMachine {
  return new ChatStateMachine(initialContext);
}

export const chatStore = createChatStateMachine();

export function navigateTo(nextState: UIState, options: NavigateToOptions = {}): void {
  chatStore.navigateTo(nextState, options);
}

export function goBack(): void {
  chatStore.goBack();
}

export function reset(): void {
  chatStore.reset();
}

export async function executeSearch(query: string, options: ExecuteSearchOptions = {}): Promise<void> {
  await chatStore.executeSearch(query, options);
}

export async function selectParliamentarianById(
  id: string,
  options: SelectParliamentarianByIdOptions = {}
): Promise<boolean> {
  return chatStore.selectParliamentarianById(id, options);
}

export async function openParliamentarianBills(
  options: OpenParliamentarianBillsOptions = {}
): Promise<boolean> {
  return chatStore.openParliamentarianBills(options);
}

export function openParliamentarianVotes(): boolean {
  return chatStore.openParliamentarianVotes();
}

export async function selectProposalById(
  id: string,
  options: SelectProposalByIdOptions = {}
): Promise<boolean> {
  return chatStore.selectProposalById(id, options);
}

export function selectVoteById(id: string): boolean {
  return chatStore.selectVoteById(id);
}
