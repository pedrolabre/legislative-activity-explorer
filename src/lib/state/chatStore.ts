import { get, writable } from 'svelte/store';
import {
  emptyInitialSearchResults,
  findInitialSearchResults,
  type InitialSearchParliamentarianResult,
  type InitialSearchProposalResult,
  type InitialSearchResults
} from '$lib/data/initialSearchFixtures';
import {
  getParliamentarianDetailById,
  type ParliamentarianDetail as ParliamentarianDetailFixture
} from '$lib/data/parliamentarianDetailFixtures';
import {
  getBillById,
  type BillSource,
  type ParliamentarianBill
} from '$lib/data/parliamentarianBillFixtures';
import {
  getVoteById,
  type ParliamentarianVote,
  type VotePosition as FixtureVotePosition
} from '$lib/data/parliamentarianVoteFixtures';
import type {
  LegislativeProposal,
  LegislativeSource,
  Parliamentarian,
  RollCallVote,
  UIState,
  VotePosition
} from '$lib/domain';

export interface ChatContext {
  currentState: UIState;
  historyStack: UIState[];
  lastQuery: string;
  parliamentariansFound: Parliamentarian[];
  proposalsFound: LegislativeProposal[];
  selectedParliamentarian: Parliamentarian | null;
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
  findResults?: (query: string) => InitialSearchResults;
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

function inferLegislativeSource(value: string): LegislativeSource {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

  return normalized.includes('senado') || normalized.includes('senador') ? 'senado' : 'camara';
}

function parseProposalTitle(title: string) {
  const match = title.match(/^([A-Z]+)\s+(\d+)\/(\d{4})$/);

  if (!match) {
    return {
      type: title,
      number: undefined,
      year: undefined
    };
  }

  return {
    type: match[1],
    number: match[2],
    year: Number(match[3])
  };
}

function normalizeVotePosition(vote: FixtureVotePosition): VotePosition {
  const normalized = vote
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR');

  if (normalized === 'NAO') {
    return 'NAO';
  }

  if (normalized === 'ABSTENCAO') {
    return 'ABSTENCAO';
  }

  if (normalized === 'AUSENTE') {
    return 'AUSENTE';
  }

  return 'SIM';
}

function mapSearchParliamentarian(result: InitialSearchParliamentarianResult): Parliamentarian {
  return {
    id: result.id,
    source: inferLegislativeSource(result.office),
    sourceId: result.id,
    name: result.name,
    office: result.office,
    party: result.party,
    state: result.state,
    status: result.status
  };
}

function mapSearchProposal(result: InitialSearchProposalResult): LegislativeProposal {
  const parsedTitle = parseProposalTitle(result.title);

  return {
    id: result.id,
    source: inferLegislativeSource(result.chamber),
    sourceId: result.id,
    title: result.title,
    type: parsedTitle.type,
    number: parsedTitle.number,
    year: parsedTitle.year,
    subject: result.subject,
    status: result.status,
    references: []
  };
}

function mapParliamentarianDetail(parliamentarian: ParliamentarianDetailFixture): Parliamentarian {
  return {
    id: parliamentarian.id,
    source: inferLegislativeSource(parliamentarian.chamber),
    sourceId: parliamentarian.id,
    name: parliamentarian.name,
    fullName: parliamentarian.fullName,
    office: parliamentarian.office,
    party: parliamentarian.party,
    state: parliamentarian.state,
    status: parliamentarian.status,
    term: parliamentarian.term,
    photoUrl: parliamentarian.photoUrl,
    email: parliamentarian.email
  };
}

function mapBillSource(source: BillSource) {
  return {
    id: source.id,
    type: source.type === 'official' ? 'official' : 'technical',
    title: source.title,
    publisher: source.publisher,
    url: source.url
  } satisfies LegislativeProposal['references'][number];
}

function mapBillToProposal(bill: ParliamentarianBill): LegislativeProposal {
  const parsedTitle = parseProposalTitle(bill.identification);
  const references = bill.sources.map(mapBillSource);

  return {
    id: bill.id,
    source: inferLegislativeSource(bill.chamber),
    sourceId: bill.id,
    title: bill.identification,
    type: parsedTitle.type,
    number: parsedTitle.number,
    year: parsedTitle.year,
    subject: bill.subject,
    status: bill.status,
    relationship: bill.relationship,
    presentedAt: bill.presentedAt,
    officialSummary: bill.officialSummary,
    simplifiedSummary: bill.factualSummary,
    officialUrl: references.find((reference) => reference.type === 'official')?.url,
    references
  };
}

function mapVoteToRollCallVote(vote: ParliamentarianVote): RollCallVote {
  return {
    id: vote.id,
    source: inferLegislativeSource(vote.chamber),
    sourceId: vote.id,
    proposalId: vote.billIdentification,
    votedAt: vote.votedAt,
    description: vote.description,
    result: vote.officialResult,
    counts: vote.counts
      ? {
          yes: vote.counts.yes,
          no: vote.counts.no,
          abstention: vote.counts.abstention,
          absent: vote.counts.absent
        }
      : undefined,
    individualVotes: vote.individualVotes.map((individualVote) => ({
      parliamentarianName: individualVote.parliamentarianName,
      party: individualVote.party,
      state: individualVote.state,
      vote: normalizeVotePosition(individualVote.vote)
    }))
  };
}

function applySearchResults(
  context: ChatContext,
  query: string,
  results: InitialSearchResults
): ChatContext {
  const nextContext = {
    ...context,
    lastQuery: query,
    parliamentariansFound: results.parliamentarians.map(mapSearchParliamentarian),
    proposalsFound: results.proposals.map(mapSearchProposal),
    selectedParliamentarian: null,
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
  const findResults = options.findResults ?? findInitialSearchResults;
  const delayMs = options.delayMs ?? defaultSearchDelayMs;

  chatStore.update((context) => ({
    ...context,
    currentState: 'SEARCHING',
    historyStack: [],
    lastQuery: normalizedQuery,
    parliamentariansFound: emptyInitialSearchResults.parliamentarians.map(mapSearchParliamentarian),
    proposalsFound: emptyInitialSearchResults.proposals.map(mapSearchProposal),
    selectedParliamentarian: null,
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
        const results = findResults(normalizedQuery);
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
  const parliamentarian = getParliamentarianDetailById(id);

  if (!parliamentarian) {
    return false;
  }

  navigateTo('PARLIAMENTARIAN_DETAIL', {
    updates: {
      selectedParliamentarian: mapParliamentarianDetail(parliamentarian),
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
      selectedProposal: null,
      selectedVote: null
    }
  });

  return true;
}

export function selectProposalById(id: string) {
  const context = get(chatStore);
  const bill = getBillById(id);

  if (!bill || bill.parliamentarianId !== context.selectedParliamentarian?.id) {
    return false;
  }

  navigateTo('BILL_DETAIL', {
    updates: {
      selectedProposal: mapBillToProposal(bill),
      selectedVote: null
    }
  });

  return true;
}

export function selectVoteById(id: string) {
  const context = get(chatStore);
  const vote = getVoteById(id);

  if (!vote || vote.parliamentarianId !== context.selectedParliamentarian?.id) {
    return false;
  }

  navigateTo('BILL_VOTES', {
    updates: {
      selectedProposal: null,
      selectedVote: mapVoteToRollCallVote(vote)
    }
  });

  return true;
}
