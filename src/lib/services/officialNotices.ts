import { OfficialApiClientError } from '$lib/api/officialApiErrors';
import type { LegislativeSource } from '$lib/domain';
import { OfficialMapperError } from '$lib/mappers/officialMapperError';

export type OfficialRecoverableStatus = 'fulfilled' | 'partial' | 'unavailable' | 'failed';
export type OfficialRecoverableErrorKind =
  | 'client'
  | 'network'
  | 'http'
  | 'official-unavailable'
  | 'invalid-payload'
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
  status?: number;
}

const officialUnavailableHttpStatuses = new Set([429, 502, 503, 504]);

export function isOfficialClientError(error: unknown): error is OfficialApiClientError {
  return error instanceof OfficialApiClientError;
}

export function isOfficialMapperError(error: unknown): error is OfficialMapperError {
  return error instanceof OfficialMapperError;
}

export function getOfficialErrorKind(error: unknown): OfficialRecoverableErrorKind {
  if (isOfficialClientError(error)) {
    if (error.kind === 'http' && officialUnavailableHttpStatuses.has(error.status ?? 0)) {
      return 'official-unavailable';
    }

    return error.kind;
  }

  if (isOfficialMapperError(error)) {
    return 'mapper';
  }

  return 'unknown';
}

export function getOfficialErrorStatus(error: unknown) {
  return isOfficialClientError(error) ? error.status : undefined;
}

export function getSourceReference(source: LegislativeSource) {
  return source === 'camara' ? 'da Câmara dos Deputados' : 'do Senado Federal';
}

export function getOfficialClientErrorMessage(
  sourceReference: string,
  label: string,
  error: OfficialApiClientError
) {
  const kind = getOfficialErrorKind(error);

  if (kind === 'timeout') {
    return `A consulta oficial de ${label} ${sourceReference} excedeu o tempo limite.`;
  }

  if (kind === 'invalid-payload') {
    return `A fonte oficial ${sourceReference} retornou dados de ${label} em formato inesperado.`;
  }

  if (kind === 'official-unavailable') {
    if (error.status === 429) {
      return `A fonte oficial ${sourceReference} informou limite temporário de acesso. A consulta pode ser repetida mais tarde.`;
    }

    return `A fonte oficial ${sourceReference} informou indisponibilidade temporária. A consulta pode ser repetida mais tarde.`;
  }

  if (kind === 'http') {
    return `A fonte oficial ${sourceReference} retornou uma falha HTTP nesta consulta.`;
  }

  return `A fonte oficial ${sourceReference} não pôde ser consultada neste momento.`;
}

export function getOfficialMapperErrorMessage(label: string, sourceReference: string) {
  return `Dados oficiais de ${label} ${sourceReference} vieram incompletos nesta consulta.`;
}

export function joinRecoverableNotices(...notices: string[]) {
  return notices
    .map((notice) => notice.trim())
    .filter(Boolean)
    .join(' ');
}

function getDisplayableRecoverableMessage<TEntity extends string>(
  errors: OfficialRecoverableError<TEntity>[]
) {
  return errors
    .find(
      (error) =>
        error.message.trim() &&
        error.kind !== 'client' &&
        error.kind !== 'unknown'
    )
    ?.message.trim();
}

export function getRecoverableStatusNotice<TEntity extends string>(
  status: OfficialRecoverableStatus,
  label: string,
  errors: OfficialRecoverableError<TEntity>[] = []
) {
  const recoverableMessage = errors.find((error) => error.message.trim())?.message.trim();
  const displayableRecoverableMessage = getDisplayableRecoverableMessage(errors);

  if (status === 'fulfilled') {
    return '';
  }

  if (status === 'partial') {
    return recoverableMessage ?? `Dados oficiais de ${label} vieram incompletos nesta consulta.`;
  }

  if (status === 'unavailable') {
    return recoverableMessage ?? `Consulta oficial de ${label} ainda não conectada nesta versão.`;
  }

  return (
    displayableRecoverableMessage ??
    `Dados oficiais de ${label} não puderam ser carregados neste momento.`
  );
}
