import {
  getVoteById as getFixtureVoteById,
  getVotesByParliamentarianId as getFixtureVotesByParliamentarianId
} from '$lib/data/parliamentarianVoteFixtures';
import type { RollCallVote } from '$lib/domain';
import { mapVoteToDomain } from './fixtureAdapters';

export function getVotesByParliamentarianId(parliamentarianId: string): RollCallVote[] {
  return getFixtureVotesByParliamentarianId(parliamentarianId).map(mapVoteToDomain);
}

export function getVoteById(id: string): RollCallVote | null {
  const vote = getFixtureVoteById(id);

  return vote ? mapVoteToDomain(vote) : null;
}

export function getVoteByIdForParliamentarian(
  id: string,
  parliamentarianId: string
): RollCallVote | null {
  const vote = getFixtureVoteById(id);

  if (!vote || vote.parliamentarianId !== parliamentarianId) {
    return null;
  }

  return mapVoteToDomain(vote);
}
