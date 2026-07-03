import type { LegislativeSource } from '$lib/domain/legislativeSource';

export type OfficialApiErrorKind = 'http' | 'network' | 'invalid-payload' | 'timeout';

export interface OfficialApiClientErrorOptions {
  kind: OfficialApiErrorKind;
  source: LegislativeSource;
  status?: number;
  url?: string;
  cause?: unknown;
  name?: string;
}

export class OfficialApiClientError extends Error {
  kind: OfficialApiErrorKind;
  source: LegislativeSource;
  status?: number;
  url?: string;

  constructor(message: string, options: OfficialApiClientErrorOptions) {
    super(message, { cause: options.cause });
    this.name = options.name ?? 'OfficialApiClientError';
    this.kind = options.kind;
    this.source = options.source;
    this.status = options.status;
    this.url = options.url;
  }
}
