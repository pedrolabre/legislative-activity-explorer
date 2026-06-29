import { getBillById, getBillsByParliamentarianId } from '$lib/data/parliamentarianBillFixtures';
import type { LegislativeProposal } from '$lib/domain';
import { mapBillToDomain } from './fixtureAdapters';
import { attachEditorialReferencesToProposal } from './referenceService';

function mapBillToProposalWithReferences(bill: Parameters<typeof mapBillToDomain>[0]) {
  return attachEditorialReferencesToProposal(mapBillToDomain(bill));
}

export function getProposalsByParliamentarianId(parliamentarianId: string): LegislativeProposal[] {
  return getBillsByParliamentarianId(parliamentarianId).map(mapBillToProposalWithReferences);
}

export function getProposalById(id: string): LegislativeProposal | null {
  const proposal = getBillById(id);

  return proposal ? mapBillToProposalWithReferences(proposal) : null;
}

export function getProposalByIdForParliamentarian(
  id: string,
  parliamentarianId: string
): LegislativeProposal | null {
  const proposal = getBillById(id);

  if (!proposal || proposal.parliamentarianId !== parliamentarianId) {
    return null;
  }

  return mapBillToProposalWithReferences(proposal);
}
