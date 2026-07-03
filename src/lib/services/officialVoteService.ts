import {
  CamaraApiClient,
  type CamaraApiLink,
  type CamaraVotacaoPayload
} from '$lib/api/camaraClient';
import type { LegislativeProposal, LegislativeSource, RollCallVote } from '$lib/domain';
import {
  backendFutureRequiredMessage,
  officialSenadoProposalVotesUnavailableMessage
} from '$lib/ui/officialMessages';
import {
  CamaraMapperError,
  mapCamaraVotacaoToRollCallVote,
  mapCamaraVotosToIndividualVotes
} from '$lib/mappers/camaraMapper';
import {
  createOfficialApiClients,
  type OfficialApiClientFactoryOptions
} from './officialApiClientFactory';
import {
  getOfficialErrorKind,
  isOfficialClientError,
  isOfficialMapperError
} from './officialNotices';

export type OfficialVoteEntity = 'proposal-votes' | 'vote-detail' | 'individual-votes';
export type OfficialVoteStatus = 'fulfilled' | 'partial' | 'unavailable' | 'failed';
export type OfficialVoteErrorKind =
  | 'client'
  | 'mapper'
  | 'timeout'
  | 'unsupported-source'
  | 'pagination-limit'
  | 'unknown';

export interface OfficialVoteRecoverableError {
  source: LegislativeSource;
  entity: OfficialVoteEntity;
  kind: OfficialVoteErrorKind;
  message: string;
}

export interface OfficialVoteListResult<T> {
  status: OfficialVoteStatus;
  data: T[];
  errors: OfficialVoteRecoverableError[];
}

export type OfficialCamaraVoteClient = Pick<
  CamaraApiClient,
  'getProposicaoVotacoesByIdPage' | 'getVotacaoById' | 'getVotacaoVotosById'
>;

export interface OfficialVoteServiceOptions extends OfficialApiClientFactoryOptions {
  camaraClient?: OfficialCamaraVoteClient;
  maxVotesPerProposal?: number;
}

const defaultMaxVotesPerProposal = 50;

function getConfiguredCamaraVoteClient(options: OfficialVoteServiceOptions) {
  return options.camaraClient ?? createOfficialApiClients(options).camaraClient;
}

function getErrorKind(error: unknown): OfficialVoteErrorKind {
  return getOfficialErrorKind(error) as OfficialVoteErrorKind;
}

function getEntityLabel(entity: OfficialVoteEntity) {
  if (entity === 'proposal-votes') {
    return 'votações associadas';
  }

  if (entity === 'vote-detail') {
    return 'detalhe de votação';
  }

  return 'lista nominal de votação';
}

function getErrorMessage(entity: OfficialVoteEntity, error: unknown) {
  const entityLabel = getEntityLabel(entity);

  if (isOfficialClientError(error)) {
    if (error.kind === 'timeout') {
      return `A consulta oficial de ${entityLabel} da Câmara dos Deputados excedeu o tempo limite.`;
    }

    if (error.kind === 'invalid-payload') {
      return `Dados oficiais de ${entityLabel} da Câmara dos Deputados vieram incompletos nesta consulta.`;
    }

    return `Dados oficiais de ${entityLabel} da Câmara dos Deputados não puderam ser carregados neste momento.`;
  }

  if (isOfficialMapperError(error)) {
    return `Dados oficiais de ${entityLabel} da Câmara dos Deputados vieram incompletos nesta consulta.`;
  }

  return `Falha temporária ao processar dados oficiais de ${entityLabel}.`;
}

function toRecoverableError(
  entity: OfficialVoteEntity,
  error: unknown
): OfficialVoteRecoverableError {
  return {
    source: 'camara',
    entity,
    kind: getErrorKind(error),
    message: getErrorMessage(entity, error)
  };
}

function hasNextPageLink(links: CamaraApiLink[]) {
  return links.some((link) => link.rel === 'next' && Boolean(link.href?.trim()));
}

function createPaginationLimitError(maxVotesPerProposal: number): OfficialVoteRecoverableError {
  const voteLimitLabel =
    maxVotesPerProposal === 1 ? '1 votação' : `${maxVotesPerProposal} votações`;

  return {
    source: 'camara',
    entity: 'proposal-votes',
    kind: 'pagination-limit',
    message: `Há mais votações na fonte oficial. Limite máximo desta consulta: ${voteLimitLabel} por proposição. ${backendFutureRequiredMessage}`
  };
}

function createUnsupportedSourceError(source: LegislativeSource): OfficialVoteRecoverableError {
  return {
    source,
    entity: 'proposal-votes',
    kind: 'unsupported-source',
    message:
      source === 'senado'
        ? officialSenadoProposalVotesUnavailableMessage
        : 'Votações oficiais desta fonte ainda não conectadas nesta versão.'
  };
}

function getListStatus<T>(items: T[], errors: OfficialVoteRecoverableError[]): OfficialVoteStatus {
  if (errors.length === 0) {
    return 'fulfilled';
  }

  return items.length > 0 ? 'partial' : 'failed';
}

function mergeDefinedVotePayload(
  basePayload: CamaraVotacaoPayload,
  detailPayload: CamaraVotacaoPayload
): CamaraVotacaoPayload {
  return {
    id: detailPayload.id ?? basePayload.id,
    uri: detailPayload.uri ?? basePayload.uri,
    data: detailPayload.data ?? basePayload.data,
    dataHoraRegistro: detailPayload.dataHoraRegistro ?? basePayload.dataHoraRegistro,
    siglaOrgao: detailPayload.siglaOrgao ?? basePayload.siglaOrgao,
    uriOrgao: detailPayload.uriOrgao ?? basePayload.uriOrgao,
    uriEvento: detailPayload.uriEvento ?? basePayload.uriEvento,
    proposicaoObjeto: detailPayload.proposicaoObjeto ?? basePayload.proposicaoObjeto,
    uriProposicaoObjeto: detailPayload.uriProposicaoObjeto ?? basePayload.uriProposicaoObjeto,
    descricao: detailPayload.descricao ?? basePayload.descricao,
    resultado: detailPayload.resultado ?? basePayload.resultado,
    aprovacao: detailPayload.aprovacao ?? basePayload.aprovacao
  };
}

function sortVotesByDateDesc(votes: RollCallVote[]) {
  return [...votes].sort((first, second) => {
    const firstDate = first.votedAt ?? '';
    const secondDate = second.votedAt ?? '';

    if (firstDate !== secondDate) {
      return secondDate.localeCompare(firstDate);
    }

    return first.id.localeCompare(second.id);
  });
}

function requireRollCallVoteSourceId(vote: RollCallVote) {
  const sourceId = vote.sourceId?.trim();

  if (!sourceId) {
    throw new CamaraMapperError('votacao', 'id');
  }

  return sourceId;
}

async function loadOfficialCamaraVote(
  payload: CamaraVotacaoPayload,
  proposalIdentification: string,
  client: OfficialCamaraVoteClient
) {
  const errors: OfficialVoteRecoverableError[] = [];
  let vote = mapCamaraVotacaoToRollCallVote(payload, {
    proposalIdentification
  });
  let votePayload = payload;

  try {
    const sourceId = requireRollCallVoteSourceId(vote);

    votePayload = mergeDefinedVotePayload(votePayload, await client.getVotacaoById(sourceId));
    vote = mapCamaraVotacaoToRollCallVote(votePayload, {
      proposalIdentification
    });
  } catch (error) {
    errors.push(toRecoverableError('vote-detail', error));
  }

  try {
    const sourceId = requireRollCallVoteSourceId(vote);
    const individualVotes = mapCamaraVotosToIndividualVotes(
      await client.getVotacaoVotosById(sourceId)
    );

    vote = mapCamaraVotacaoToRollCallVote(votePayload, {
      proposalIdentification,
      individualVotes
    });
  } catch (error) {
    errors.push(toRecoverableError('individual-votes', error));
  }

  return {
    vote,
    errors
  };
}

export async function getOfficialVotesByProposal(
  proposal: LegislativeProposal,
  options: OfficialVoteServiceOptions = {}
): Promise<OfficialVoteListResult<RollCallVote>> {
  if (proposal.source !== 'camara') {
    return {
      status: 'unavailable',
      data: [],
      errors: [createUnsupportedSourceError(proposal.source)]
    };
  }

  const client = getConfiguredCamaraVoteClient(options);
  const maxVotesPerProposal = options.maxVotesPerProposal ?? defaultMaxVotesPerProposal;
  const errors: OfficialVoteRecoverableError[] = [];
  const votes: RollCallVote[] = [];

  let page;

  try {
    page = await client.getProposicaoVotacoesByIdPage(proposal.sourceId);
  } catch (error) {
    return {
      status: 'failed',
      data: [],
      errors: [toRecoverableError('proposal-votes', error)]
    };
  }

  const selectedPayloads = page.data.slice(0, maxVotesPerProposal);

  if (hasNextPageLink(page.links) || selectedPayloads.length < page.data.length) {
    errors.push(createPaginationLimitError(maxVotesPerProposal));
  }

  for (const payload of selectedPayloads) {
    try {
      const voteResult = await loadOfficialCamaraVote(payload, proposal.title, client);

      votes.push(voteResult.vote);
      errors.push(...voteResult.errors);
    } catch (error) {
      errors.push(toRecoverableError('proposal-votes', error));
    }
  }

  return {
    status: getListStatus(votes, errors),
    data: sortVotesByDateDesc(votes),
    errors
  };
}

export { officialSenadoProposalVotesUnavailableMessage };
