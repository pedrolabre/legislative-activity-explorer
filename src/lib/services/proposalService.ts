import { getBillById, getBillsByParliamentarianId } from '$lib/data/parliamentarianBillFixtures';
import type { LegislativeProposal } from '$lib/domain';
import { mapBillToDomain } from './fixtureAdapters';

export function getProposalsByParliamentarianId(parliamentarianId: string): LegislativeProposal[] {
  return getBillsByParliamentarianId(parliamentarianId).map(mapBillToDomain);
}

export function getProposalById(id: string): LegislativeProposal | null {
  const proposal = getBillById(id);

  return proposal ? mapBillToDomain(proposal) : null;
}

export function getProposalByIdForParliamentarian(
  id: string,
  parliamentarianId: string
): LegislativeProposal | null {
  const proposal = getBillById(id);

  if (!proposal || proposal.parliamentarianId !== parliamentarianId) {
    return null;
  }

  return mapBillToDomain(proposal);
}
