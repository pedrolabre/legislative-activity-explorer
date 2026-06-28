export const EXTERNAL_REFERENCE_TYPES = ['official', 'press', 'technical'] as const;

export type ExternalReferenceType = (typeof EXTERNAL_REFERENCE_TYPES)[number];
