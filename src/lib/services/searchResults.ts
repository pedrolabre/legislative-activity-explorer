import type { LegislativeProposal, Parliamentarian } from '$lib/domain';

export interface SearchResults {
  parliamentarians: Parliamentarian[];
  proposals: LegislativeProposal[];
  recoverableMessage?: string;
  directProposal?: LegislativeProposal;
}

export const emptySearchResults: SearchResults = {
  parliamentarians: [],
  proposals: []
};
