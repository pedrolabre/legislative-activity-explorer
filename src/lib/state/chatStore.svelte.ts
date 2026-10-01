import { SvelteSet } from 'svelte/reactivity';
import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
import {
  getOfficialParliamentarianDetail as loadOfficialParliamentarianDetail,
  getOfficialProposalsByParliamentarian as loadOfficialProposalsByParliamentarian
} from '$lib/services/officialDetailService';
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
import { joinRecoverableNotices } from '$lib/services/officialNotices';
import { searchPublicRecords } from '$lib/services/publicSearchService';
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
  findParliamentarianInContext,
  findProposalInContext,
  findVoteInContext,
  genericSearchErrorMessage,
  getOfficialDetailNotice,
  hasOfficialParliamentarianIdPattern,
  hasOfficialProposalIdPattern,
  initialChatContext,
  isOfficialParliamentarian,
  isOfficialProposal,
  loadProposalOfficialDetail,
  mergeDefinedFields
} from './chatStoreHelpers';

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
    const search = options.search ?? searchPublicRecords;
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
          if (currentSearchId !== this.#searchSequence) {
            resolve();
            return;
          }

          try {
            const results = await search(normalizedQuery);

            if (currentSearchId !== this.#searchSequence) {
              resolve();
              return;
            }

            if (results.directProposal && isOfficialProposal(results.directProposal)) {
              const directProposalDetail = await loadProposalOfficialDetail(
                results.directProposal,
                options,
                true
              );

              if (currentSearchId !== this.#searchSequence) {
                resolve();
                return;
              }

              this.#context = applyDirectProposalSearchResult(
                this.#context,
                normalizedQuery,
                results,
                directProposalDetail.proposal,
                directProposalDetail.voteHistory,
                directProposalDetail.errorMessage
              );
              this.#notifySubscribers();
            } else {
              this.#context = applySearchResults(this.#context, normalizedQuery, results);
              this.#notifySubscribers();
            }
          } catch {
            if (currentSearchId !== this.#searchSequence) {
              return;
            }

            this.#context = {
              ...this.#context,
              currentState: 'ERROR',
              errorMessage: genericSearchErrorMessage
            };
            this.#notifySubscribers();
          } finally {
            if (this.#pendingSearch?.resolve === resolve) {
              this.#pendingSearch = null;
            }

            resolve();
          }
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
    const contextParliamentarian = findParliamentarianInContext(this.#context, id);

    if (!contextParliamentarian || !isOfficialParliamentarian(contextParliamentarian)) {
      return false;
    }

    const officialResult = await (options.getOfficialParliamentarianDetail ??
      loadOfficialParliamentarianDetail)(contextParliamentarian);

    const parliamentarian = officialResult.data
      ? mergeDefinedFields(contextParliamentarian, officialResult.data)
      : contextParliamentarian;
    const errorMessage = getOfficialDetailNotice(officialResult.status, 'parlamentar');

    this.navigateTo('PARLIAMENTARIAN_DETAIL', {
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

  async openParliamentarianBills(
    options: OpenParliamentarianBillsOptions = {}
  ): Promise<boolean> {
    if (!this.#context.selectedParliamentarian) {
      return false;
    }

    if (!isOfficialParliamentarian(this.#context.selectedParliamentarian)) {
      return false;
    }

    const officialResult = await (options.getOfficialProposalsByParliamentarian ??
      loadOfficialProposalsByParliamentarian)(this.#context.selectedParliamentarian);

    const parliamentarianProposals = officialResult.data;
    const errorMessage = getOfficialDetailNotice(
      officialResult.status,
      'proposições associadas',
      officialResult.errors
    );

    this.navigateTo('PARLIAMENTARIAN_BILLS', {
      updates: {
        parliamentarianProposals,
        selectedProposal: null,
        selectedVote: null,
        errorMessage
      }
    });

    return true;
  }

  openParliamentarianVotes(): boolean {
    if (!this.#context.selectedParliamentarian) {
      return false;
    }

    if (!isOfficialParliamentarian(this.#context.selectedParliamentarian)) {
      return false;
    }

    const voteHistory = this.#context.voteHistory.filter(
      (vote) => vote.source === this.#context.selectedParliamentarian?.source
    );
    const errorMessage =
      voteHistory.length > 0
        ? joinRecoverableNotices(
            officialParliamentarianVoteHistoryUnavailableMessage,
            officialParliamentarianSessionVotesCoverageMessage
          )
        : officialParliamentarianVoteHistoryUnavailableMessage;

    this.navigateTo('PARLIAMENTARIAN_VOTES', {
      updates: {
        voteHistory,
        selectedProposal: null,
        selectedVote: null,
        errorMessage
      }
    });

    return true;
  }

  async selectProposalById(
    id: string,
    options: SelectProposalByIdOptions = {}
  ): Promise<boolean> {
    const contextProposal = findProposalInContext(this.#context, id);

    if (!contextProposal || !isOfficialProposal(contextProposal)) {
      return false;
    }

    const proposalDetail = await loadProposalOfficialDetail(contextProposal, options, true);
    const proposal = proposalDetail.proposal;
    const errorMessage = proposalDetail.errorMessage;
    const voteHistory = proposalDetail.voteHistory;

    this.navigateTo('BILL_DETAIL', {
      updates: {
        selectedProposal: proposal,
        selectedVote: null,
        voteHistory,
        errorMessage
      }
    });

    return true;
  }

  selectVoteById(id: string): boolean {
    const selectedParliamentarian = this.#context.selectedParliamentarian;
    const selectedProposal = this.#context.selectedProposal;
    const contextVote = findVoteInContext(this.#context, id);

    if (!selectedParliamentarian) {
      if (
        !selectedProposal ||
        !isOfficialProposal(selectedProposal) ||
        !contextVote ||
        contextVote.source !== selectedProposal.source
      ) {
        return false;
      }

      this.navigateTo('BILL_VOTES', {
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

    this.navigateTo('BILL_VOTES', {
      updates: {
        selectedVote: contextVote,
        errorMessage: ''
      }
    });

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
