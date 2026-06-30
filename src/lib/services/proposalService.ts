import { getBillById, getBillsByParliamentarianId } from '$lib/data/parliamentarianBillFixtures';
import type { LegislativeProposal } from '$lib/domain';
import { mapBillToDomain } from './fixtureAdapters';
import { attachReviewedFactualSummaryToProposal } from './factualSummaryService';
import { attachEditorialReferencesToProposal } from './referenceService';

function mapBillToProposalWithEditorialData(bill: Parameters<typeof mapBillToDomain>[0]) {
  return attachEditorialReferencesToProposal(
    attachReviewedFactualSummaryToProposal(mapBillToDomain(bill))
  );
}

export function getProposalsByParliamentarianId(parliamentarianId: string): LegislativeProposal[] {
  return getBillsByParliamentarianId(parliamentarianId).map(mapBillToProposalWithEditorialData);
}

export function getProposalById(id: string): LegislativeProposal | null {
  const proposal = getBillById(id);

  return proposal ? mapBillToProposalWithEditorialData(proposal) : null;
}

export function getProposalByIdForParliamentarian(
  id: string,
  parliamentarianId: string
): LegislativeProposal | null {
  const proposal = getBillById(id);

  if (!proposal || proposal.parliamentarianId !== parliamentarianId) {
    return null;
  }

  return mapBillToProposalWithEditorialData(proposal);
}
