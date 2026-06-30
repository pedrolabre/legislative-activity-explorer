import { getReviewedFactualSummaryByProposalId } from '$lib/data/factualSummaryCatalog';
import type { LegislativeProposal } from '$lib/domain';

export function getReviewedFactualSummaryForProposal(
  proposal: LegislativeProposal,
  catalogProposalId = proposal.id
): string | undefined {
  return getReviewedFactualSummaryByProposalId(catalogProposalId)?.trim() || undefined;
}

export function attachReviewedFactualSummaryToProposal(
  proposal: LegislativeProposal,
  catalogProposalId = proposal.id
): LegislativeProposal {
  const { simplifiedSummary: _existingSummary, ...proposalWithoutSummary } = proposal;
  const reviewedSummary = getReviewedFactualSummaryForProposal(proposal, catalogProposalId);

  return reviewedSummary
    ? {
        ...proposalWithoutSummary,
        simplifiedSummary: reviewedSummary
      }
    : proposalWithoutSummary;
}

export function attachReviewedFactualSummaryToProposals(
  proposals: LegislativeProposal[]
): LegislativeProposal[] {
  return proposals.map((proposal) => attachReviewedFactualSummaryToProposal(proposal));
}
