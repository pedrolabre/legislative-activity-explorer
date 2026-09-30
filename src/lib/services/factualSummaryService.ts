import {
  findFactualSummaryCatalogEntry,
  getReviewedFactualSummaryByProposalId
} from '$lib/data/factualSummaryCatalog';
import type { LegislativeProposal } from '$lib/domain';

export function getReviewedFactualSummaryForProposal(
  proposal: LegislativeProposal,
  catalogProposalId = proposal.id
): string | undefined {
  if (catalogProposalId && catalogProposalId !== proposal.id) {
    const directMatch = getReviewedFactualSummaryByProposalId(catalogProposalId)?.trim();
    if (directMatch) {
      return directMatch;
    }
  }

  const proposalEntry = findFactualSummaryCatalogEntry(proposal);
  if (proposalEntry) {
    return proposalEntry.summary.trim() || undefined;
  }

  if (catalogProposalId) {
    return getReviewedFactualSummaryByProposalId(catalogProposalId)?.trim() || undefined;
  }

  return undefined;
}

export function attachReviewedFactualSummaryToProposal(
  proposal: LegislativeProposal,
  catalogProposalId = proposal.id
): LegislativeProposal {
  const proposalWithoutSummary = { ...proposal };
  delete proposalWithoutSummary.simplifiedSummary;
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
