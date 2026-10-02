import type { LegislativeProposal, RollCallVote } from '$lib/domain';
import {
  getOfficialParliamentarianDetail as loadOfficialParliamentarianDetail,
  getOfficialProposalsByParliamentarian as loadOfficialProposalsByParliamentarian
} from '$lib/services/officialDetailService';
import {
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianVoteHistoryUnavailableMessage
} from '$lib/ui/officialMessages';
import { joinRecoverableNotices } from '$lib/services/officialNotices';
import { searchPublicRecords } from '$lib/services/publicSearchService';
import type { SearchResults } from '$lib/services/searchResults';
import type {
  ChatContext,
  ChatContextPatch,
  ExecuteSearchOptions,
  OpenParliamentarianBillsOptions,
  SelectParliamentarianByIdOptions,
  SelectProposalByIdOptions
} from './chatStoreTypes';
import {
  findParliamentarianInContext,
  findProposalInContext,
  findVoteInContext,
  genericSearchErrorMessage,
  getOfficialDetailNotice,
  isOfficialParliamentarian,
  isOfficialProposal,
  loadProposalOfficialDetail,
  mergeDefinedFields
} from './chatStoreHelpers';

export function isAbortError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
    return true;
  }

  return false;
}

export type SearchOperationResult =
  | {
      kind: 'direct-proposal';
      results: SearchResults;
      proposal: LegislativeProposal;
      voteHistory: RollCallVote[];
      detailNotice: string;
    }
  | {
      kind: 'standard';
      results: SearchResults;
    }
  | {
      kind: 'aborted';
    }
  | {
      kind: 'error';
      message: string;
    };

export async function executeSearchOperation(
  query: string,
  options: ExecuteSearchOptions,
  signal: AbortSignal
): Promise<SearchOperationResult> {
  const search = options.search ?? searchPublicRecords;

  try {
    const results = await (
      search as (
        q: string,
        opt?: { signal?: AbortSignal }
      ) => SearchResults | Promise<SearchResults>
    )(query, { signal });

    if (signal.aborted) {
      return { kind: 'aborted' };
    }

    if (results.directProposal && isOfficialProposal(results.directProposal)) {
      const directProposalDetail = await loadProposalOfficialDetail(
        results.directProposal,
        options,
        true
      );

      if (signal.aborted) {
        return { kind: 'aborted' };
      }

      return {
        kind: 'direct-proposal',
        results,
        proposal: directProposalDetail.proposal,
        voteHistory: directProposalDetail.voteHistory,
        detailNotice: directProposalDetail.errorMessage
      };
    }

    return {
      kind: 'standard',
      results
    };
  } catch (cause) {
    if (signal.aborted || isAbortError(cause)) {
      return { kind: 'aborted' };
    }

    return {
      kind: 'error',
      message: genericSearchErrorMessage
    };
  }
}

export async function executeSelectParliamentarian(
  context: ChatContext,
  id: string,
  options: SelectParliamentarianByIdOptions = {}
): Promise<{ updates: ChatContextPatch } | null> {
  const contextParliamentarian = findParliamentarianInContext(context, id);

  if (!contextParliamentarian || !isOfficialParliamentarian(contextParliamentarian)) {
    return null;
  }

  const officialResult = await (options.getOfficialParliamentarianDetail ??
    loadOfficialParliamentarianDetail)(contextParliamentarian);

  const parliamentarian = officialResult.data
    ? mergeDefinedFields(contextParliamentarian, officialResult.data)
    : contextParliamentarian;
  const errorMessage = getOfficialDetailNotice(officialResult.status, 'parlamentar');

  return {
    updates: {
      selectedParliamentarian: parliamentarian,
      parliamentarianProposals: [],
      selectedProposal: null,
      selectedVote: null,
      voteHistory: [],
      errorMessage
    }
  };
}

export async function executeOpenParliamentarianBills(
  context: ChatContext,
  options: OpenParliamentarianBillsOptions = {}
): Promise<{ updates: ChatContextPatch } | null> {
  if (!context.selectedParliamentarian || !isOfficialParliamentarian(context.selectedParliamentarian)) {
    return null;
  }

  const officialResult = await (options.getOfficialProposalsByParliamentarian ??
    loadOfficialProposalsByParliamentarian)(context.selectedParliamentarian);

  const parliamentarianProposals = officialResult.data;
  const errorMessage = getOfficialDetailNotice(
    officialResult.status,
    'proposições associadas',
    officialResult.errors
  );

  return {
    updates: {
      parliamentarianProposals,
      selectedProposal: null,
      selectedVote: null,
      errorMessage
    }
  };
}

export function executeOpenParliamentarianVotes(
  context: ChatContext
): { updates: ChatContextPatch } | null {
  if (!context.selectedParliamentarian || !isOfficialParliamentarian(context.selectedParliamentarian)) {
    return null;
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

  return {
    updates: {
      voteHistory,
      selectedProposal: null,
      selectedVote: null,
      errorMessage
    }
  };
}

export async function executeSelectProposal(
  context: ChatContext,
  id: string,
  options: SelectProposalByIdOptions = {}
): Promise<{ updates: ChatContextPatch } | null> {
  const contextProposal = findProposalInContext(context, id);

  if (!contextProposal || !isOfficialProposal(contextProposal)) {
    return null;
  }

  const proposalDetail = await loadProposalOfficialDetail(contextProposal, options, true);

  return {
    updates: {
      selectedProposal: proposalDetail.proposal,
      selectedVote: null,
      voteHistory: proposalDetail.voteHistory,
      errorMessage: proposalDetail.errorMessage
    }
  };
}

export function executeSelectVote(
  context: ChatContext,
  id: string
): { updates: ChatContextPatch } | null {
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
      return null;
    }

    return {
      updates: {
        selectedVote: contextVote,
        errorMessage: ''
      }
    };
  }

  if (!isOfficialParliamentarian(selectedParliamentarian)) {
    return null;
  }

  if (!contextVote || contextVote.source !== selectedParliamentarian.source) {
    return null;
  }

  return {
    updates: {
      selectedVote: contextVote,
      errorMessage: ''
    }
  };
}
