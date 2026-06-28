import { getParliamentarianDetailById } from '$lib/data/parliamentarianDetailFixtures';
import type { Parliamentarian } from '$lib/domain';
import { mapParliamentarianDetailToDomain } from './fixtureAdapters';

export function getParliamentarianById(id: string): Parliamentarian | null {
  const parliamentarian = getParliamentarianDetailById(id);

  return parliamentarian ? mapParliamentarianDetailToDomain(parliamentarian) : null;
}
