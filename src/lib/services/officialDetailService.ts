import {
  CamaraApiClient,
  CamaraApiClientError,
  type CamaraProposicaoPayload
} from '$lib/api/camaraClient';
import { SenadoApiClient, SenadoApiClientError } from '$lib/api/senadoClient';
import type { LegislativeProposal, LegislativeSource, Parliamentarian } from '$lib/domain';
import {
  CamaraMapperError,
  mapCamaraDeputadoToParliamentarian,
  mapCamaraProposicaoToLegislativeProposal
} from '$lib/mappers/camaraMapper';
import {
  mapSenadoMateriaToLegislativeProposal,
  mapSenadoSenadorToParliamentarian,
  SenadoMapperError
} from '$lib/mappers/senadoMapper';
import { attachEditorialReferencesToProposal } from './referenceService';

export type OfficialDetailEntity = 'parliamentarian' | 'parliamentarian-proposals' | 'proposal';
export type OfficialDetailStatus = 'fulfilled' | 'partial' | 'unavailable' | 'failed';
export type OfficialDetailErrorKind =
  | 'client'
  | 'mapper'
  | 'timeout'
  | 'unsupported-source'
  | 'unknown';

export interface OfficialDetailRecoverableError {
  source: LegislativeSource;
  entity: OfficialDetailEntity;
  kind: OfficialDetailErrorKind;
  message: string;
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
  'getDeputadoById' | 'getProposicoesByDeputadoAutor' | 'getProposicaoById'
>;

export type OfficialSenadoDetailClient = Pick<SenadoApiClient, 'getSenadorById' | 'getMateriaById'>;

export interface OfficialDetailServiceOptions {
  camaraClient?: OfficialCamaraDetailClient;
  senadoClient?: OfficialSenadoDetailClient;
}

function isOfficialClientError(
  error: unknown
): error is CamaraApiClientError | SenadoApiClientError {
  return error instanceof CamaraApiClientError || error instanceof SenadoApiClientError;
}

function getErrorKind(error: unknown): OfficialDetailErrorKind {
  if (isOfficialClientError(error)) {
    if (error.kind === 'timeout') {
      return 'timeout';
    }

    return 'client';
  }

  if (error instanceof CamaraMapperError || error instanceof SenadoMapperError) {
    return 'mapper';
  }

  return 'unknown';
}

function getSourceReference(source: LegislativeSource) {
  return source === 'camara' ? 'da Camara dos Deputados' : 'do Senado Federal';
}

function getEntityLabel(entity: OfficialDetailEntity) {
  if (entity === 'parliamentarian') {
    return 'parlamentar';
  }

  if (entity === 'parliamentarian-proposals') {
    return 'proposicoes associadas';
  }

  return 'proposicao ou materia';
}

function getErrorMessage(
  source: LegislativeSource,
  entity: OfficialDetailEntity,
  error: unknown
) {
  const sourceReference = getSourceReference(source);
  const entityLabel = getEntityLabel(entity);

  if (isOfficialClientError(error)) {
    if (error.kind === 'timeout') {
      return `A consulta oficial ${sourceReference} excedeu o tempo limite.`;
    }

    if (error.kind === 'invalid-payload') {
      return `Dados oficiais de ${entityLabel} ${sourceReference} vieram incompletos nesta consulta.`;
    }

    return `Dados oficiais de ${entityLabel} ${sourceReference} nao puderam ser carregados neste momento.`;
  }

  if (error instanceof CamaraMapperError || error instanceof SenadoMapperError) {
    return `Dados oficiais de ${entityLabel} ${sourceReference} vieram incompletos nesta consulta.`;
  }

  return `Falha temporaria ao processar dados oficiais de ${entityLabel}.`;
}

function toRecoverableError(
  source: LegislativeSource,
  entity: OfficialDetailEntity,
  error: unknown
): OfficialDetailRecoverableError {
  return {
    source,
    entity,
    kind: getErrorKind(error),
    message: getErrorMessage(source, entity, error)
  };
}

function toUnavailableError(
  source: LegislativeSource,
  entity: OfficialDetailEntity,
  message: string
): OfficialDetailRecoverableError {
  return {
    source,
    entity,
    kind: 'unsupported-source',
    message
  };
}

function getListStatus<T>(
  items: T[],
  errors: OfficialDetailRecoverableError[]
): OfficialDetailStatus {
  if (errors.length === 0) {
    return 'fulfilled';
  }

  return items.length > 0 ? 'partial' : 'failed';
}

function mapCamaraAuthorProposals(payloads: CamaraProposicaoPayload[]) {
  const proposals: LegislativeProposal[] = [];
  const errors: OfficialDetailRecoverableError[] = [];

  for (const payload of payloads) {
    try {
      const proposal = mapCamaraProposicaoToLegislativeProposal(payload);

      proposals.push(
        attachEditorialReferencesToProposal({
          ...proposal,
          relationship: proposal.relationship ?? 'Autoria'
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

export async function getOfficialParliamentarianDetail(
  parliamentarian: Parliamentarian,
  options: OfficialDetailServiceOptions = {}
): Promise<OfficialDetailResult<Parliamentarian>> {
  const { source, sourceId } = parliamentarian;

  try {
    const data =
      source === 'camara'
        ? mapCamaraDeputadoToParliamentarian(
            await (options.camaraClient ?? new CamaraApiClient()).getDeputadoById(sourceId)
          )
        : mapSenadoSenadorToParliamentarian(
            await (options.senadoClient ?? new SenadoApiClient()).getSenadorById(sourceId)
          );

    return {
      status: 'fulfilled',
      data,
      errors: []
    };
  } catch (error) {
    return {
      status: 'failed',
      data: null,
      errors: [toRecoverableError(source, 'parliamentarian', error)]
    };
  }
}

export async function getOfficialProposalsByParliamentarian(
  parliamentarian: Parliamentarian,
  options: OfficialDetailServiceOptions = {}
): Promise<OfficialDetailListResult<LegislativeProposal>> {
  if (parliamentarian.source === 'senado') {
    return {
      status: 'unavailable',
      data: [],
      errors: [
        toUnavailableError(
          'senado',
          'parliamentarian-proposals',
          'Dados oficiais de proposicoes associadas do Senado Federal nao estao disponiveis nesta consulta.'
        )
      ]
    };
  }

  try {
    const payloads = await (
      options.camaraClient ?? new CamaraApiClient()
    ).getProposicoesByDeputadoAutor(parliamentarian.sourceId);
    const { proposals, errors } = mapCamaraAuthorProposals(payloads);

    return {
      status: getListStatus(proposals, errors),
      data: proposals,
      errors
    };
  } catch (error) {
    return {
      status: 'failed',
      data: [],
      errors: [toRecoverableError('camara', 'parliamentarian-proposals', error)]
    };
  }
}

export async function getOfficialProposalDetail(
  proposal: LegislativeProposal,
  options: OfficialDetailServiceOptions = {}
): Promise<OfficialDetailResult<LegislativeProposal>> {
  const { source, sourceId } = proposal;

  try {
    const data =
      source === 'camara'
        ? mapCamaraProposicaoToLegislativeProposal(
            await (options.camaraClient ?? new CamaraApiClient()).getProposicaoById(sourceId)
          )
        : mapSenadoMateriaToLegislativeProposal(
            await (options.senadoClient ?? new SenadoApiClient()).getMateriaById(sourceId)
          );

    return {
      status: 'fulfilled',
      data: attachEditorialReferencesToProposal(data, proposal.id),
      errors: []
    };
  } catch (error) {
    return {
      status: 'failed',
      data: null,
      errors: [toRecoverableError(source, 'proposal', error)]
    };
  }
}
