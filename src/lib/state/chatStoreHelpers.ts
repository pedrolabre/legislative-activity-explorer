import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
import {
  getOfficialProposalDetail as loadOfficialProposalDetail,
  type OfficialDetailRecoverableError,
  type OfficialDetailListResult,
  type OfficialDetailResult
} from '$lib/services/officialDetailService';
import {
  getOfficialVotesByProposal as loadOfficialVotesByProposal,
  type OfficialVoteListResult,
  type OfficialVoteRecoverableError
} from '$lib/services/officialVoteService';
import { getRecoverableStatusNotice, joinRecoverableNotices } from '$lib/services/officialNotices';
import type { SearchResults } from '$lib/services/searchResults';
import type { ChatContext, SelectProposalByIdOptions } from './chatStoreTypes';

export const defaultSearchDelayMs = 450;
export const genericSearchErrorMessage = 'Não foi possível concluir a busca nesta página.';

export function createInitialChatContext(): ChatContext {
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

export function applySearchResults(
  context: ChatContext,
  query: string,
  results: SearchResults
): ChatContext {
  const nextContext: ChatContext = {
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

export function applyDirectProposalSearchResult(
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
  const nextContext: ChatContext = {
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

export function isOfficialParliamentarian(parliamentarian: Parliamentarian): boolean {
  return parliamentarian.origin === 'official';
}

export function hasOfficialParliamentarianIdPattern(id: string): boolean {
  return /^camara-(?!proposicao-).+/.test(id) || /^senado-(?!materia-|processo-).+/.test(id);
}

export function isOfficialProposal(proposal: LegislativeProposal): boolean {
  return proposal.origin === 'official';
}

export function hasOfficialProposalIdPattern(id: string): boolean {
  return (
    /^camara-proposicao-.+/.test(id) ||
    /^senado-materia-.+/.test(id) ||
    /^senado-processo-.+/.test(id)
  );
}

export function mergeDefinedFields<T extends object>(base: T, detail: T): T {
  const merged = { ...base };

  for (const key of Object.keys(detail) as Array<keyof T>) {
    const value = detail[key];

    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

export function findParliamentarianInContext(
  context: ChatContext,
  id: string
): Parliamentarian | null {
  return (
    context.parliamentariansFound.find((parliamentarian) => parliamentarian.id === id) ?? null
  );
}

export function findProposalInContext(
  context: ChatContext,
  id: string
): LegislativeProposal | null {
  return (
    context.parliamentarianProposals.find((proposal) => proposal.id === id) ??
    context.proposalsFound.find((proposal) => proposal.id === id) ??
    null
  );
}

export function findVoteInContext(context: ChatContext, id: string): RollCallVote | null {
  return context.voteHistory.find((vote) => vote.id === id) ?? null;
}

export function getOfficialDetailNotice(
  status: OfficialDetailResult<unknown>['status'] | OfficialDetailListResult<unknown>['status'],
  label: string,
  errors: OfficialDetailRecoverableError[] = []
): string {
  return getRecoverableStatusNotice(status, label, errors);
}

export function getOfficialVoteNotice(
  status: OfficialVoteListResult<unknown>['status'],
  label: string,
  errors: OfficialVoteRecoverableError[] = []
): string {
  return getRecoverableStatusNotice(status, label, errors);
}

export async function loadProposalOfficialDetail(
  controlledProposal: LegislativeProposal,
  options: Pick<SelectProposalByIdOptions, 'getOfficialProposalDetail' | 'getOfficialVotesByProposal'>,
  includeOfficialVotes: boolean
): Promise<{
  proposal: LegislativeProposal;
  voteHistory: RollCallVote[];
  errorMessage: string;
}> {
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
