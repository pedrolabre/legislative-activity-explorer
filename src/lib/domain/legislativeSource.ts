export const LEGISLATIVE_SOURCES = ['camara', 'senado'] as const;

export type LegislativeSource = (typeof LEGISLATIVE_SOURCES)[number];
