import {
  emptyInitialSearchResults,
  findInitialSearchResults
} from '$lib/data/initialSearchFixtures';
import type { LegislativeProposal, Parliamentarian } from '$lib/domain';
import {
  mapSearchParliamentarianToDomain,
  mapSearchProposalToDomain
} from './fixtureAdapters';

export interface SearchResults {
  parliamentarians: Parliamentarian[];
  proposals: LegislativeProposal[];
}

export const emptySearchResults: SearchResults = {
  parliamentarians: emptyInitialSearchResults.parliamentarians.map(mapSearchParliamentarianToDomain),
  proposals: emptyInitialSearchResults.proposals.map(mapSearchProposalToDomain)
};

export function searchInitialRecords(query: string): SearchResults {
  const results = findInitialSearchResults(query);

  return {
    parliamentarians: results.parliamentarians.map(mapSearchParliamentarianToDomain),
    proposals: results.proposals.map(mapSearchProposalToDomain)
  };
}
