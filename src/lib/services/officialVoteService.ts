import {
  CamaraApiClient,
  type CamaraApiLink,
  type CamaraVotacaoPayload
} from '$lib/api/camaraClient';
import { SenadoApiClient, type SenadoVotacaoPayload } from '$lib/api/senadoClient';
import type { LegislativeProposal, LegislativeSource, RollCallVote } from '$lib/domain';
import { backendFutureRequiredMessage } from '$lib/ui/officialMessages';
import {
  CamaraMapperError,
  mapCamaraVotacaoToRollCallVote,
  mapCamaraVotosToIndividualVotes
} from '$lib/mappers/camaraMapper';
import { mapSenadoVotacaoToRollCallVote } from '$lib/mappers/senadoMapper';
import {
  createOfficialApiClients,
  type OfficialApiClientFactoryOptions
} from './officialApiClientFactory';
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

export type OfficialVoteEntity = 'proposal-votes' | 'vote-detail' | 'individual-votes';
export type OfficialVoteStatus = 'fulfilled' | 'partial' | 'unavailable' | 'failed';
export type OfficialVoteErrorKind = OfficialRecoverableErrorKind;

export interface OfficialVoteRecoverableError {
  source: LegislativeSource;
  entity: OfficialVoteEntity;
  kind: OfficialVoteErrorKind;
  message: string;
  status?: number;
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
export type OfficialSenadoVoteClient = Pick<SenadoApiClient, 'getVotacoes'>;

export interface OfficialVoteServiceOptions extends OfficialApiClientFactoryOptions {
  camaraClient?: OfficialCamaraVoteClient;
  senadoClient?: OfficialSenadoVoteClient;
  maxVotesPerProposal?: number;
}

const defaultMaxVotesPerProposal = 50;

function getConfiguredCamaraVoteClient(options: OfficialVoteServiceOptions) {
  return options.camaraClient ?? createOfficialApiClients(options).camaraClient;
}

function getConfiguredSenadoVoteClient(options: OfficialVoteServiceOptions) {
  return options.senadoClient ?? createOfficialApiClients(options).senadoClient;
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

function getErrorMessage(source: LegislativeSource, entity: OfficialVoteEntity, error: unknown) {
  const entityLabel = getEntityLabel(entity);
  const sourceReference = getSourceReference(source);

  if (isOfficialClientError(error)) {
    return getOfficialClientErrorMessage(sourceReference, entityLabel, error);
  }

  if (isOfficialMapperError(error)) {
    return getOfficialMapperErrorMessage(entityLabel, sourceReference);
  }

  return `Falha temporária ao processar dados oficiais de ${entityLabel}.`;
}

function toRecoverableError(
  source: LegislativeSource,
  entity: OfficialVoteEntity,
  error: unknown
): OfficialVoteRecoverableError {
  const status = getOfficialErrorStatus(error);

  return {
    source,
    entity,
    kind: getErrorKind(error),
    message: getErrorMessage(source, entity, error),
    ...(status !== undefined ? { status } : {})
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
    message: `A fonte oficial retornou mais votações ou indicou paginação adicional. Limite máximo desta consulta: ${voteLimitLabel} por proposição. ${backendFutureRequiredMessage}`
  };
}

function createSenadoPaginationLimitError(
  maxVotesPerProposal: number
): OfficialVoteRecoverableError {
  const voteLimitLabel =
    maxVotesPerProposal === 1 ? '1 votação' : `${maxVotesPerProposal} votações`;

  return {
    source: 'senado',
    entity: 'proposal-votes',
    kind: 'pagination-limit',
    message: `A fonte oficial do Senado retornou mais votações do que o limite local desta consulta. Limite máximo: ${voteLimitLabel} por proposição. ${backendFutureRequiredMessage}`
  };
}

function createUnsupportedSourceError(source: LegislativeSource): OfficialVoteRecoverableError {
  return {
    source,
    entity: 'proposal-votes',
    kind: 'unsupported-source',
    message: 'Votações oficiais desta fonte ainda não conectadas nesta versão.'
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
    errors.push(toRecoverableError('camara', 'vote-detail', error));
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
    errors.push(toRecoverableError('camara', 'individual-votes', error));
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
  if (proposal.source === 'senado') {
    return getOfficialSenadoVotesByProposal(
      proposal,
      getConfiguredSenadoVoteClient(options),
      options.maxVotesPerProposal ?? defaultMaxVotesPerProposal
    );
  }

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
    page = await client.getProposicaoVotacoesByIdPage(proposal.sourceId, {
      ordem: 'DESC',
      ordenarPor: 'dataHoraRegistro'
    });
  } catch (error) {
    return {
      status: 'failed',
      data: [],
      errors: [toRecoverableError('camara', 'proposal-votes', error)]
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
      errors.push(toRecoverableError('camara', 'proposal-votes', error));
    }
  }

  return {
    status: getListStatus(votes, errors),
    data: sortVotesByDateDesc(votes),
    errors
  };
}

function getSenadoVoteSearchOptions(proposal: LegislativeProposal) {
  if (proposal.id === `senado-processo-${proposal.sourceId}`) {
    return {
      idProcesso: proposal.sourceId
    };
  }

  if (proposal.id === `senado-materia-${proposal.sourceId}`) {
    return {
      codigoMateria: proposal.sourceId
    };
  }

  return {
    sigla: proposal.type,
    numero: proposal.number,
    ano: proposal.year
  };
}

function mapSenadoVotePayloads(
  payloads: SenadoVotacaoPayload[],
  proposal: LegislativeProposal
) {
  const votes: RollCallVote[] = [];
  const errors: OfficialVoteRecoverableError[] = [];

  for (const payload of payloads) {
    try {
      votes.push(
        mapSenadoVotacaoToRollCallVote(payload, {
          proposalIdentification: proposal.title
        })
      );
    } catch (error) {
      errors.push(toRecoverableError('senado', 'proposal-votes', error));
    }
  }

  return {
    votes,
    errors
  };
}

async function getOfficialSenadoVotesByProposal(
  proposal: LegislativeProposal,
  client: OfficialSenadoVoteClient,
  maxVotesPerProposal: number
): Promise<OfficialVoteListResult<RollCallVote>> {
  let payloads: SenadoVotacaoPayload[];

  try {
    payloads = await client.getVotacoes(getSenadoVoteSearchOptions(proposal));
  } catch (error) {
    return {
      status: 'failed',
      data: [],
      errors: [toRecoverableError('senado', 'proposal-votes', error)]
    };
  }

  const selectedPayloads = payloads.slice(0, maxVotesPerProposal);
  const { votes, errors } = mapSenadoVotePayloads(selectedPayloads, proposal);

  if (selectedPayloads.length < payloads.length) {
    errors.push(createSenadoPaginationLimitError(maxVotesPerProposal));
  }

  return {
    status: getListStatus(votes, errors),
    data: sortVotesByDateDesc(votes),
    errors
  };
}
