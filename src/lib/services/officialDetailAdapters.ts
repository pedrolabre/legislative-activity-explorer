import type {
  CamaraApiClient,
  CamaraProposicaoPayload
} from '$lib/api/camaraClient';
import type {
  SenadoApiClient,
  SenadoMandatoPayload,
  SenadoProcessoPayload,
  SenadoRelatoriaPayload,
  SenadoSenadorPayload
} from '$lib/api/senadoClient';
import type { LegislativeProposal, LegislativeSource, Parliamentarian } from '$lib/domain';
import {
  mapCamaraProposicaoTemasToSubject,
  mapCamaraProposicaoToLegislativeProposal
} from '$lib/mappers/camaraMapper';
import {
  mapSenadoProcessoToLegislativeProposal,
  mapSenadoRelatoriaToLegislativeProposal,
  mapSenadoSenadorToParliamentarian
} from '$lib/mappers/senadoMapper';
import { backendFutureRequiredMessage } from '$lib/ui/officialMessages';
import { attachReviewedFactualSummaryToProposal } from './factualSummaryService';
import {
  getOfficialClientErrorMessage,
  getOfficialErrorKind,
  getOfficialErrorStatus,
  getOfficialMapperErrorMessage,
  getSourceReference,
  isOfficialClientError,
  isOfficialMapperError,
  type OfficialRecoverableErrorKind
} from './officialNotices';
import { attachEditorialReferencesToProposal } from './referenceService';

export type OfficialDetailEntity = 'parliamentarian' | 'parliamentarian-proposals' | 'proposal';
export type OfficialDetailStatus = 'fulfilled' | 'partial' | 'unavailable' | 'failed';
export type OfficialDetailErrorKind = OfficialRecoverableErrorKind;

export interface OfficialDetailRecoverableError {
  source: LegislativeSource;
  entity: OfficialDetailEntity;
  kind: OfficialDetailErrorKind;
  message: string;
  status?: number;
}

export interface OfficialDetailResult<T> {
  status: OfficialDetailStatus;
  data: T | null;
  errors: OfficialDetailRecoverableError[];
}

export interface OfficialDetailListResult<T> {
  status: OfficialDetailStatus;
  data: T[];
  errors: OfficialDetailRecoverableError[];
}

export type OfficialCamaraDetailClient = Pick<
  CamaraApiClient,
  | 'getDeputadoById'
  | 'getProposicoesByDeputadoAutor'
  | 'getProposicaoById'
  | 'getProposicaoTemasById'
>;

export type OfficialSenadoDetailClient = Pick<
  SenadoApiClient,
  | 'getSenadorById'
  | 'getSenadorMandatosById'
  | 'getMateriaById'
  | 'getProcessoById'
  | 'searchProcessos'
  | 'searchRelatorias'
>;

export function isAbortError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
    return true;
  }

  return false;
}

function getErrorKind(error: unknown): OfficialDetailErrorKind {
  return getOfficialErrorKind(error);
}

function getEntityLabel(entity: OfficialDetailEntity): string {
  if (entity === 'parliamentarian') {
    return 'parlamentar';
  }

  if (entity === 'parliamentarian-proposals') {
    return 'proposições associadas';
  }

  return 'proposição ou matéria';
}

function getErrorMessage(
  source: LegislativeSource,
  entity: OfficialDetailEntity,
  error: unknown
): string {
  const sourceReference = getSourceReference(source);
  const entityLabel = getEntityLabel(entity);

  if (isOfficialClientError(error)) {
    return getOfficialClientErrorMessage(sourceReference, entityLabel, error);
  }

  if (isOfficialMapperError(error)) {
    return getOfficialMapperErrorMessage(entityLabel, sourceReference);
  }

  return `Falha temporária ao processar dados oficiais de ${entityLabel}.`;
}

export function toRecoverableError(
  source: LegislativeSource,
  entity: OfficialDetailEntity,
  error: unknown
): OfficialDetailRecoverableError {
  const status = getOfficialErrorStatus(error);

  return {
    source,
    entity,
    kind: getErrorKind(error),
    message: getErrorMessage(source, entity, error),
    ...(status !== undefined ? { status } : {})
  };
}

export function getListStatus<T>(
  items: T[],
  errors: OfficialDetailRecoverableError[]
): OfficialDetailStatus {
  if (errors.length === 0) {
    return 'fulfilled';
  }

  return items.length > 0 ? 'partial' : 'failed';
}

export function mapCamaraAuthorProposals(payloads: CamaraProposicaoPayload[]): {
  proposals: LegislativeProposal[];
  errors: OfficialDetailRecoverableError[];
} {
  const proposals: LegislativeProposal[] = [];
  const errors: OfficialDetailRecoverableError[] = [];

  for (const payload of payloads) {
    try {
      const proposal = mapCamaraProposicaoToLegislativeProposal(payload);

      proposals.push(
        attachEditorialReferencesToProposal({
          ...attachReviewedFactualSummaryToProposal(proposal)
        })
      );
    } catch (error) {
      errors.push(toRecoverableError('camara', 'parliamentarian-proposals', error));
    }
  }

  return {
    proposals,
    errors
  };
}

interface SenadoAssociatedGroupResult {
  proposals: LegislativeProposal[];
  errors: OfficialDetailRecoverableError[];
  succeeded: boolean;
}

function createSenadoAssociatedLimitError(
  maxSenadoAssociatedProcesses: number
): OfficialDetailRecoverableError {
  const limitLabel =
    maxSenadoAssociatedProcesses === 1
      ? '1 registro'
      : `${maxSenadoAssociatedProcesses} registros`;

  return {
    source: 'senado',
    entity: 'parliamentarian-proposals',
    kind: 'pagination-limit',
    message: `A fonte oficial do Senado retornou mais autorias ou relatorias do que o limite local desta consulta. Limite maximo: ${limitLabel}. ${backendFutureRequiredMessage}`
  };
}

function sortAssociatedProposals(proposals: LegislativeProposal[]): LegislativeProposal[] {
  return [...proposals].sort((left, right) =>
    left.title.localeCompare(right.title, 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    })
  );
}

function joinProposalRelationships(
  left: string | undefined,
  right: string | undefined
): string | undefined {
  const relationships = [left, right]
    .map((relationship) => relationship?.trim())
    .filter((relationship): relationship is string => Boolean(relationship));
  const uniqueRelationships = [...new Set(relationships)];

  return uniqueRelationships.length > 0 ? uniqueRelationships.join('; ') : undefined;
}

function deduplicateAssociatedProposals(proposals: LegislativeProposal[]): LegislativeProposal[] {
  const byId = new Map<string, LegislativeProposal>();

  for (const proposal of proposals) {
    const existingProposal = byId.get(proposal.id);

    if (!existingProposal) {
      byId.set(proposal.id, proposal);
      continue;
    }

    byId.set(proposal.id, {
      ...existingProposal,
      ...proposal,
      relationship: joinProposalRelationships(
        existingProposal.relationship,
        proposal.relationship
      ),
      officialSummary: existingProposal.officialSummary ?? proposal.officialSummary,
      authorship: existingProposal.authorship ?? proposal.authorship,
      subject: existingProposal.subject ?? proposal.subject,
      status: existingProposal.status ?? proposal.status,
      presentedAt: existingProposal.presentedAt ?? proposal.presentedAt
    });
  }

  return [...byId.values()];
}

async function loadSenadoAssociatedGroup<TPayload>(
  load: () => Promise<TPayload[]>,
  map: (payload: TPayload) => LegislativeProposal,
  signal?: AbortSignal
): Promise<SenadoAssociatedGroupResult> {
  const proposals: LegislativeProposal[] = [];
  const errors: OfficialDetailRecoverableError[] = [];

  try {
    for (const payload of await load()) {
      try {
        proposals.push(map(payload));
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
          throw error;
        }
        errors.push(toRecoverableError('senado', 'parliamentarian-proposals', error));
      }
    }

    return {
      proposals,
      errors,
      succeeded: true
    };
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    return {
      proposals,
      errors: [toRecoverableError('senado', 'parliamentarian-proposals', error)],
      succeeded: false
    };
  }
}

export async function getOfficialSenadoAssociatedProposals(
  parliamentarian: Parliamentarian,
  client: OfficialSenadoDetailClient,
  maxSenadoAssociatedProcesses: number,
  signal?: AbortSignal
): Promise<OfficialDetailListResult<LegislativeProposal>> {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('A consulta foi cancelada.', 'AbortError');
  }

  const [authorResult, rapporteurResult] = await Promise.all([
    loadSenadoAssociatedGroup<SenadoProcessoPayload>(
      () =>
        client.searchProcessos({
          codigoParlamentarAutor: parliamentarian.sourceId,
          signal
        }),
      (payload) => ({
        ...attachEditorialReferencesToProposal(
          attachReviewedFactualSummaryToProposal(mapSenadoProcessoToLegislativeProposal(payload))
        ),
        relationship: 'Autoria'
      }),
      signal
    ),
    loadSenadoAssociatedGroup<SenadoRelatoriaPayload>(
      () =>
        client.searchRelatorias({
          codigoParlamentar: parliamentarian.sourceId,
          signal
        }),
      (payload) =>
        attachEditorialReferencesToProposal(
          attachReviewedFactualSummaryToProposal(mapSenadoRelatoriaToLegislativeProposal(payload))
        ),
      signal
    )
  ]);
  const errors = [...authorResult.errors, ...rapporteurResult.errors];
  const succeededGroups = Number(authorResult.succeeded) + Number(rapporteurResult.succeeded);
  const proposals = sortAssociatedProposals(
    deduplicateAssociatedProposals([
      ...authorResult.proposals,
      ...rapporteurResult.proposals
    ])
  );
  const limitedProposals = proposals.slice(0, maxSenadoAssociatedProcesses);

  if (limitedProposals.length < proposals.length) {
    errors.push(createSenadoAssociatedLimitError(maxSenadoAssociatedProcesses));
  }

  const status: OfficialDetailStatus =
    errors.length === 0 ? 'fulfilled' : succeededGroups > 0 ? 'partial' : 'failed';

  return {
    status,
    data: limitedProposals,
    errors
  };
}

export async function getOfficialCamaraProposalDetail(
  proposal: LegislativeProposal,
  client: OfficialCamaraDetailClient,
  signal?: AbortSignal
): Promise<OfficialDetailResult<LegislativeProposal>> {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('A consulta foi cancelada.', 'AbortError');
  }

  const errors: OfficialDetailRecoverableError[] = [];
  let data: LegislativeProposal;

  try {
    data = mapCamaraProposicaoToLegislativeProposal(
      await client.getProposicaoById(proposal.sourceId, { signal })
    );
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    return {
      status: 'failed',
      data: null,
      errors: [toRecoverableError('camara', 'proposal', error)]
    };
  }

  try {
    const subject = mapCamaraProposicaoTemasToSubject(
      await client.getProposicaoTemasById(proposal.sourceId, { signal })
    );

    if (subject) {
      data = {
        ...data,
        subject
      };
    }
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    errors.push(toRecoverableError('camara', 'proposal', error));
  }

  return {
    status: errors.length > 0 ? 'partial' : 'fulfilled',
    data: attachReviewedFactualSummaryToProposal(
      attachEditorialReferencesToProposal(data, proposal.id),
      proposal.id
    ),
    errors
  };
}

export async function getOfficialSenadoParliamentarianDetail(
  parliamentarian: Parliamentarian,
  client: OfficialSenadoDetailClient,
  signal?: AbortSignal
): Promise<OfficialDetailResult<Parliamentarian>> {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('A consulta foi cancelada.', 'AbortError');
  }

  const errors: OfficialDetailRecoverableError[] = [];
  let senatorPayload: SenadoSenadorPayload;

  try {
    senatorPayload = await client.getSenadorById(parliamentarian.sourceId, { signal });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    return {
      status: 'failed',
      data: null,
      errors: [toRecoverableError('senado', 'parliamentarian', error)]
    };
  }

  let mandates: SenadoMandatoPayload[] = [];

  try {
    mandates = await client.getSenadorMandatosById(parliamentarian.sourceId, { signal });
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    errors.push(toRecoverableError('senado', 'parliamentarian', error));
  }

  try {
    return {
      status: errors.length > 0 ? 'partial' : 'fulfilled',
      data: mapSenadoSenadorToParliamentarian(senatorPayload, {
        mandates
      }),
      errors
    };
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    return {
      status: 'failed',
      data: null,
      errors: [toRecoverableError('senado', 'parliamentarian', error)]
    };
  }
}

export function isModernSenadoProcessProposal(proposal: LegislativeProposal): boolean {
  return proposal.id === `senado-processo-${proposal.sourceId}`;
}
