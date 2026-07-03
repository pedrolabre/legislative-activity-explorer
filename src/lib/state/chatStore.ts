import { get, writable } from 'svelte/store';
import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
import {
  getOfficialParliamentarianDetail as loadOfficialParliamentarianDetail,
  officialSenadoAssociatedMattersUnavailableMessage,
  getOfficialProposalDetail as loadOfficialProposalDetail,
  getOfficialProposalsByParliamentarian as loadOfficialProposalsByParliamentarian,
  type OfficialDetailRecoverableError,
  type OfficialDetailListResult,
  type OfficialDetailResult
} from '$lib/services/officialDetailService';
import {
  getOfficialVotesByProposal as loadOfficialVotesByProposal,
  officialSenadoProposalVotesUnavailableMessage,
  type OfficialVoteListResult,
  type OfficialVoteRecoverableError
} from '$lib/services/officialVoteService';
import { getParliamentarianById } from '$lib/services/parliamentarianService';
import {
  getProposalByIdForParliamentarian,
  getProposalsByParliamentarianId
} from '$lib/services/proposalService';
import { searchPublicRecords } from '$lib/services/publicSearchService';
import { emptySearchResults, type SearchResults } from '$lib/services/searchService';
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

export interface OpenParliamentarianVotesOptions {
  getFixtureVotesByParliamentarianId?: (parliamentarianId: string) => RollCallVote[];
}

export interface SelectProposalByIdOptions {
  getFixtureProposalByIdForParliamentarian?: (
    id: string,
    parliamentarianId: string
  ) => LegislativeProposal | null;
  getOfficialProposalDetail?: (
    proposal: LegislativeProposal
  ) => Promise<OfficialDetailResult<LegislativeProposal>>;
  getOfficialVotesByProposal?: (
    proposal: LegislativeProposal
  ) => Promise<OfficialVoteListResult<RollCallVote>>;
}

export interface SelectVoteByIdOptions {
  getFixtureVoteByIdForParliamentarian?: (
    id: string,
    parliamentarianId: string
  ) => RollCallVote | null;
}

const defaultSearchDelayMs = 450;
const genericSearchErrorMessage = 'Não foi possível concluir a busca nesta página.';
export const officialParliamentarianVoteHistoryUnavailableMessage =
  'Histórico completo por parlamentar exige backend futuro para consulta completa.';
export const officialParliamentarianSessionVotesCoverageMessage =
  'Cobertura parcial: votos exibidos vieram de proposições abertas nesta sessão.';
export const officialParliamentarianSessionVotesEmptyMessage =
  'Nenhuma votação de proposição aberta foi carregada nesta sessão.';
export const officialParliamentarianStaticCoverageDescription =
  `Abra uma proposição com votações oficiais para ver votos disponíveis nesta sessão. ${officialParliamentarianVoteHistoryUnavailableMessage}`;
export const officialSenadoStaticCoverageDescription =
  'Ainda não conectado nesta versão. Exige backend futuro para consulta completa.';
export const officialSenadoAssociatedMattersUnavailableDescription =
  'Ainda não conectado nesta versão. A consulta completa por senador exige backend futuro.';

export {
  officialSenadoAssociatedMattersUnavailableMessage,
  officialSenadoProposalVotesUnavailableMessage
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

function isOfficialParliamentarian(parliamentarian: Parliamentarian) {
  return parliamentarian.id === `${parliamentarian.source}-${parliamentarian.sourceId}`;
}

function hasOfficialParliamentarianIdPattern(id: string) {
  return /^camara-(?!proposicao-).+/.test(id) || /^senado-(?!materia-).+/.test(id);
}

function isOfficialProposal(proposal: LegislativeProposal) {
  if (proposal.source === 'camara') {
    return proposal.id === `camara-proposicao-${proposal.sourceId}`;
  }

  return proposal.id === `senado-materia-${proposal.sourceId}`;
}

function hasOfficialProposalIdPattern(id: string) {
  return /^camara-proposicao-.+/.test(id) || /^senado-materia-.+/.test(id);
}

function isOfficialCamaraProposal(proposal: LegislativeProposal) {
  return proposal.source === 'camara' && isOfficialProposal(proposal);
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
  return context.parliamentarianProposals.find((proposal) => proposal.id === id) ?? null;
}

function findVoteInContext(context: ChatContext, id: string) {
  return context.voteHistory.find((vote) => vote.id === id) ?? null;
}

function getOfficialDetailNotice(
  status: OfficialDetailResult<unknown>['status'] | OfficialDetailListResult<unknown>['status'],
  label: string,
  errors: OfficialDetailRecoverableError[] = []
) {
  const recoverableMessage = errors.find((error) => error.message.trim())?.message.trim();

  if (status === 'fulfilled') {
    return '';
  }

  if (status === 'partial') {
    return recoverableMessage ?? `Dados oficiais de ${label} vieram incompletos nesta consulta.`;
  }

  if (status === 'unavailable') {
    return recoverableMessage ?? `Consulta oficial de ${label} ainda não conectada nesta versão.`;
  }

  return `Dados oficiais de ${label} não puderam ser carregados neste momento.`;
}

function getOfficialVoteNotice(
  status: OfficialVoteListResult<unknown>['status'],
  label: string,
  errors: OfficialVoteRecoverableError[] = []
) {
  const recoverableMessage = errors.find((error) => error.message.trim())?.message.trim();

  if (status === 'fulfilled') {
    return '';
  }

  if (status === 'partial') {
    return recoverableMessage ?? `Dados oficiais de ${label} vieram incompletos nesta consulta.`;
  }

  if (status === 'unavailable') {
    return recoverableMessage ?? `Consulta oficial de ${label} ainda não conectada nesta versão.`;
  }

  return `Dados oficiais de ${label} não puderam ser carregados neste momento.`;
}

function joinRecoverableNotices(...notices: string[]) {
  return notices
    .map((notice) => notice.trim())
    .filter(Boolean)
    .join(' ');
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
  const contextParliamentarian = findParliamentarianInContext(context, id);
  const baseParliamentarian =
    contextParliamentarian && isOfficialParliamentarian(contextParliamentarian)
      ? contextParliamentarian
      : null;

  if (!baseParliamentarian) {
    if (hasOfficialParliamentarianIdPattern(id)) {
      return false;
    }
  }

  const controlledParliamentarian =
    baseParliamentarian ??
    (options.getFixtureParliamentarianById ?? getParliamentarianById)(id) ??
    contextParliamentarian;

  if (!controlledParliamentarian) {
    return false;
  }

  let parliamentarian = controlledParliamentarian;
  let errorMessage = '';

  if (isOfficialParliamentarian(controlledParliamentarian)) {
    const officialResult = await (options.getOfficialParliamentarianDetail ??
      loadOfficialParliamentarianDetail)(controlledParliamentarian);

    parliamentarian = officialResult.data
      ? mergeDefinedFields(controlledParliamentarian, officialResult.data)
      : controlledParliamentarian;
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
    errorMessage = getOfficialDetailNotice(
      officialResult.status,
      'proposições associadas',
      officialResult.errors
    );
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

export function openParliamentarianVotes(options: OpenParliamentarianVotesOptions = {}) {
  const context = get(chatStore);

  if (!context.selectedParliamentarian) {
    return false;
  }

  const isOfficialSelection = isOfficialParliamentarian(context.selectedParliamentarian);
  let voteHistory: RollCallVote[];
  let errorMessage = '';

  if (isOfficialSelection) {
    voteHistory = context.voteHistory.filter(
      (vote) => vote.source === context.selectedParliamentarian?.source
    );
    if (context.selectedParliamentarian.source === 'senado') {
      errorMessage =
        voteHistory.length > 0
          ? joinRecoverableNotices(
              officialSenadoProposalVotesUnavailableMessage,
              officialParliamentarianSessionVotesCoverageMessage
            )
          : officialSenadoProposalVotesUnavailableMessage;
    } else {
      errorMessage = officialParliamentarianVoteHistoryUnavailableMessage;
    }
  } else {
    const fixtureLoader =
      options.getFixtureVotesByParliamentarianId ?? getVotesByParliamentarianId;

    voteHistory = fixtureLoader(context.selectedParliamentarian.id);
  }

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
  const selectedParliamentarian = context.selectedParliamentarian;
  const selectedParliamentarianId = selectedParliamentarian?.id;

  if (!selectedParliamentarian || !selectedParliamentarianId) {
    return false;
  }

  const contextProposal = findProposalInContext(context, id);
  const baseProposal =
    contextProposal && isOfficialProposal(contextProposal)
      ? contextProposal
      : null;

  if (!baseProposal) {
    if (isOfficialParliamentarian(selectedParliamentarian) || hasOfficialProposalIdPattern(id)) {
      return false;
    }
  }

  const controlledProposal =
    baseProposal ??
    (options.getFixtureProposalByIdForParliamentarian ?? getProposalByIdForParliamentarian)(
      id,
      selectedParliamentarianId
    ) ??
    contextProposal;

  if (!controlledProposal) {
    return false;
  }

  let proposal = controlledProposal;
  let errorMessage = '';
  let voteHistory = isOfficialProposal(controlledProposal) ? [] : context.voteHistory;

  if (isOfficialProposal(controlledProposal)) {
    const officialResult = await (options.getOfficialProposalDetail ?? loadOfficialProposalDetail)(
      controlledProposal
    );

    proposal = officialResult.data
      ? mergeDefinedFields(controlledProposal, officialResult.data)
      : controlledProposal;
    const proposalNotice = getOfficialDetailNotice(officialResult.status, 'proposição');
    let proposalVotesNotice = '';

    if (isOfficialCamaraProposal(proposal)) {
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
  }

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

export function selectVoteById(id: string, options: SelectVoteByIdOptions = {}) {
  const context = get(chatStore);
  const selectedParliamentarian = context.selectedParliamentarian;
  const selectedParliamentarianId = selectedParliamentarian?.id;

  if (!selectedParliamentarian || !selectedParliamentarianId) {
    return false;
  }

  const contextVote = findVoteInContext(context, id);

  if (isOfficialParliamentarian(selectedParliamentarian)) {
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

  const vote =
    contextVote ??
    (options.getFixtureVoteByIdForParliamentarian ?? getVoteByIdForParliamentarian)(
      id,
      selectedParliamentarianId
    );

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
