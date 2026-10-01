import type { LegislativeProposal, Parliamentarian, RollCallVote, UIState } from '$lib/domain';
import type {
  OfficialDetailListResult,
  OfficialDetailResult
} from '$lib/services/officialDetailService';
import type {
  OfficialVoteListResult
} from '$lib/services/officialVoteService';
import type { SearchResults } from '$lib/services/searchResults';

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
