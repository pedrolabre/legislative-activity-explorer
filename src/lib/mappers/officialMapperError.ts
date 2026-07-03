import type { LegislativeSource } from '$lib/domain/legislativeSource';

export interface OfficialMapperErrorOptions {
  source: LegislativeSource;
  sourceLabel: string;
  entity: string;
  field: string;
  name?: string;
}

export class OfficialMapperError extends Error {
  source: LegislativeSource;
  entity: string;
  field: string;

  constructor(options: OfficialMapperErrorOptions) {
    super(`Payload ${options.sourceLabel} sem campo obrigatorio: ${options.entity}.${options.field}.`);
    this.name = options.name ?? 'OfficialMapperError';
    this.source = options.source;
    this.entity = options.entity;
    this.field = options.field;
  }
}
