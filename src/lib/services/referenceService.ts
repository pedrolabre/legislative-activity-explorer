import type { ExternalReference, ExternalReferenceType, LegislativeProposal } from '$lib/domain';
import { getReferencesByProposalId } from '$lib/data/referenceCatalog';

export const REQUIRED_EDITORIAL_REFERENCE_TYPES = [
  'official',
  'press',
  'technical'
] as const satisfies readonly ExternalReferenceType[];
export const REVIEWED_EXTERNAL_REFERENCE_TYPES = [
  'press',
  'technical'
] as const satisfies readonly ExternalReferenceType[];

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
    const reference = referencesByPriority.find(
      (currentReference) => currentReference.type === type
    );

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
    references
      .filter((reference) => reference.type !== 'official' && hasReviewDate(reference))
      .map((reference) => reference.type)
  );

  return REVIEWED_EXTERNAL_REFERENCE_TYPES.filter((type) => !reviewedTypes.has(type));
}

export function hasReviewedExternalReferences(references: ExternalReference[]) {
  return references.some(
    (reference) => reference.type !== 'official' && hasReviewDate(reference)
  );
}

export function hasCompleteReviewedReferenceSet(references: ExternalReference[]) {
  return getMissingReviewedReferenceTypes(references).length === 0;
}
