import {
  EXTERNAL_REFERENCE_TYPES,
  type ExternalReference,
  type ExternalReferenceType,
  type LegislativeProposal
} from '$lib/domain';
import { getReferencesByProposalId } from '$lib/data/referenceCatalog';

export const REQUIRED_EDITORIAL_REFERENCE_TYPES = EXTERNAL_REFERENCE_TYPES;

function hasReviewDate(reference: ExternalReference) {
  return Boolean(reference.checkedAt?.trim());
}

export function getEditorialReferencesForProposal(
  proposal: LegislativeProposal,
  catalogProposalId = proposal.id
): ExternalReference[] {
  const referencesByPriority = [
    ...getReferencesByProposalId(catalogProposalId),
    ...proposal.references
  ];

  return REQUIRED_EDITORIAL_REFERENCE_TYPES.flatMap((type) => {
    const reference = referencesByPriority.find((currentReference) => currentReference.type === type);

    return reference ? [reference] : [];
  });
}

export function attachEditorialReferencesToProposal(
  proposal: LegislativeProposal,
  catalogProposalId = proposal.id
): LegislativeProposal {
  return {
    ...proposal,
    references: getEditorialReferencesForProposal(proposal, catalogProposalId)
  };
}

export function attachEditorialReferencesToProposals(
  proposals: LegislativeProposal[]
): LegislativeProposal[] {
  return proposals.map((proposal) => attachEditorialReferencesToProposal(proposal));
}

export function getMissingReviewedReferenceTypes(
  references: ExternalReference[]
): ExternalReferenceType[] {
  const reviewedTypes = new Set(
    references.filter(hasReviewDate).map((reference) => reference.type)
  );

  return REQUIRED_EDITORIAL_REFERENCE_TYPES.filter((type) => !reviewedTypes.has(type));
}

export function hasCompleteReviewedReferenceSet(references: ExternalReference[]) {
  return getMissingReviewedReferenceTypes(references).length === 0;
}
