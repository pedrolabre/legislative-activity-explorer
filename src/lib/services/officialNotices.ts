import type { LegislativeSource } from '$lib/domain';
import { OfficialApiClientError } from '$lib/api/officialApiErrors';
import { OfficialMapperError } from '$lib/mappers/officialMapperError';

export type OfficialRecoverableStatus = 'fulfilled' | 'partial' | 'unavailable' | 'failed';
export type OfficialRecoverableErrorKind =
  | 'client'
  | 'mapper'
  | 'timeout'
  | 'unsupported-source'
  | 'pagination-limit'
  | 'unknown';

export interface OfficialRecoverableError<TEntity extends string> {
  source: LegislativeSource;
  entity: TEntity;
  kind: OfficialRecoverableErrorKind;
  message: string;
}

export function isOfficialClientError(error: unknown): error is OfficialApiClientError {
  return error instanceof OfficialApiClientError;
}

export function isOfficialMapperError(error: unknown): error is OfficialMapperError {
  return error instanceof OfficialMapperError;
}

export function getOfficialErrorKind(error: unknown): OfficialRecoverableErrorKind {
  if (isOfficialClientError(error)) {
    return error.kind === 'timeout' ? 'timeout' : 'client';
  }

  if (isOfficialMapperError(error)) {
    return 'mapper';
  }

  return 'unknown';
}

export function getSourceReference(source: LegislativeSource) {
  return source === 'camara' ? 'da Câmara dos Deputados' : 'do Senado Federal';
}

export function joinRecoverableNotices(...notices: string[]) {
  return notices
    .map((notice) => notice.trim())
    .filter(Boolean)
    .join(' ');
}

export function getRecoverableStatusNotice<TEntity extends string>(
  status: OfficialRecoverableStatus,
  label: string,
  errors: OfficialRecoverableError<TEntity>[] = []
) {
  const recoverableMessage = errors.find((error) => error.message.trim())?.message.trim();

  if (status === 'fulfilled') {
    return '';
  }

  if (status === 'partial') {
    return recoverableMessage ?? `Dados oficiais de ${label} vieram incompletos nesta consulta.`;
  }

  if (status === 'unavailable') {
    return recoverableMessage ?? `Consulta oficial de ${label} ainda não conectada nesta versão.`;
  }

  return `Dados oficiais de ${label} não puderam ser carregados neste momento.`;
}
