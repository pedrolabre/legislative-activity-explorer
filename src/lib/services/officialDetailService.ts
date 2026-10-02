import type { LegislativeProposal, Parliamentarian } from '$lib/domain';
import { mapCamaraDeputadoToParliamentarian } from '$lib/mappers/camaraMapper';
import {
  mapSenadoMateriaToLegislativeProposal,
  mapSenadoProcessoToLegislativeProposal
} from '$lib/mappers/senadoMapper';
import { attachReviewedFactualSummaryToProposal } from './factualSummaryService';
import {
  createOfficialApiClients,
  type OfficialApiClientFactoryOptions
} from './officialApiClientFactory';
import { attachEditorialReferencesToProposal } from './referenceService';
import {
  getListStatus,
  getOfficialCamaraProposalDetail,
  getOfficialSenadoAssociatedProposals,
  getOfficialSenadoParliamentarianDetail,
  isAbortError,
  isModernSenadoProcessProposal,
  mapCamaraAuthorProposals,
  toRecoverableError,
  type OfficialCamaraDetailClient,
  type OfficialDetailEntity,
  type OfficialDetailErrorKind,
  type OfficialDetailListResult,
  type OfficialDetailRecoverableError,
  type OfficialDetailResult,
  type OfficialDetailStatus,
  type OfficialSenadoDetailClient
} from './officialDetailAdapters';

export type {
  OfficialDetailEntity,
  OfficialDetailStatus,
  OfficialDetailErrorKind,
  OfficialDetailRecoverableError,
  OfficialDetailResult,
  OfficialDetailListResult,
  OfficialCamaraDetailClient,
  OfficialSenadoDetailClient
};

export interface OfficialDetailServiceOptions extends OfficialApiClientFactoryOptions {
  camaraClient?: OfficialCamaraDetailClient;
  senadoClient?: OfficialSenadoDetailClient;
  maxSenadoAssociatedProcesses?: number;
  signal?: AbortSignal;
}

const defaultMaxSenadoAssociatedProcesses = 40;

function getConfiguredCamaraDetailClient(options: OfficialDetailServiceOptions) {
  return options.camaraClient ?? createOfficialApiClients(options).camaraClient;
}

function getConfiguredSenadoDetailClient(options: OfficialDetailServiceOptions) {
  return options.senadoClient ?? createOfficialApiClients(options).senadoClient;
}

export async function getOfficialParliamentarianDetail(
  parliamentarian: Parliamentarian,
  options: OfficialDetailServiceOptions = {}
): Promise<OfficialDetailResult<Parliamentarian>> {
  if (options.signal?.aborted) {
    throw (
      options.signal.reason ??
      new DOMException('A consulta foi cancelada.', 'AbortError')
    );
  }

  const { source, sourceId } = parliamentarian;

  try {
    const data =
      source === 'camara'
        ? mapCamaraDeputadoToParliamentarian(
            await getConfiguredCamaraDetailClient(options).getDeputadoById(sourceId, {
              signal: options.signal
            })
          )
        : undefined;

    if (!data) {
      return getOfficialSenadoParliamentarianDetail(
        parliamentarian,
        getConfiguredSenadoDetailClient(options),
        options.signal
      );
    }

    return {
      status: 'fulfilled',
      data,
      errors: []
    };
  } catch (error) {
    if (options.signal?.aborted || isAbortError(error)) {
      throw error;
    }

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
  if (options.signal?.aborted) {
    throw (
      options.signal.reason ??
      new DOMException('A consulta foi cancelada.', 'AbortError')
    );
  }

  if (parliamentarian.source === 'senado') {
    return getOfficialSenadoAssociatedProposals(
      parliamentarian,
      getConfiguredSenadoDetailClient(options),
      options.maxSenadoAssociatedProcesses ?? defaultMaxSenadoAssociatedProcesses,
      options.signal
    );
  }

  try {
    const payloads = await getConfiguredCamaraDetailClient(options).getProposicoesByDeputadoAutor(
      parliamentarian.sourceId,
      { signal: options.signal }
    );
    const { proposals, errors } = mapCamaraAuthorProposals(payloads);

    return {
      status: getListStatus(proposals, errors),
      data: proposals,
      errors
    };
  } catch (error) {
    if (options.signal?.aborted || isAbortError(error)) {
      throw error;
    }

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
  if (options.signal?.aborted) {
    throw (
      options.signal.reason ??
      new DOMException('A consulta foi cancelada.', 'AbortError')
    );
  }

  const { source, sourceId } = proposal;

  if (source === 'camara') {
    return getOfficialCamaraProposalDetail(
      proposal,
      getConfiguredCamaraDetailClient(options),
      options.signal
    );
  }

  try {
    const senadoClient = getConfiguredSenadoDetailClient(options);
    const data = isModernSenadoProcessProposal(proposal)
      ? mapSenadoProcessoToLegislativeProposal(
          await senadoClient.getProcessoById(sourceId, { signal: options.signal })
        )
      : mapSenadoMateriaToLegislativeProposal(
          await senadoClient.getMateriaById(sourceId, { signal: options.signal })
        );

    return {
      status: 'fulfilled',
      data: attachReviewedFactualSummaryToProposal(
        attachEditorialReferencesToProposal(data, proposal.id),
        proposal.id
      ),
      errors: []
    };
  } catch (error) {
    if (options.signal?.aborted || isAbortError(error)) {
      throw error;
    }

    return {
      status: 'failed',
      data: null,
      errors: [toRecoverableError(source, 'proposal', error)]
    };
  }
}
