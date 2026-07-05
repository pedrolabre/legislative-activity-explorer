import {
  CamaraApiClient,
  type CamaraDeputadoPayload,
  type CamaraProposicaoPayload
} from '$lib/api/camaraClient';
import {
  SenadoApiClient,
  type SenadoProcessoPayload,
  type SenadoSenadorPayload
} from '$lib/api/senadoClient';
import type { LegislativeProposal, LegislativeSource, Parliamentarian } from '$lib/domain';
import {
  mapCamaraDeputadoToParliamentarian,
  mapCamaraProposicaoToLegislativeProposal
} from '$lib/mappers/camaraMapper';
import {
  mapSenadoProcessoToLegislativeProposal,
  mapSenadoSenadorToParliamentarian
} from '$lib/mappers/senadoMapper';
import {
  createOfficialApiClients,
  type OfficialApiClientFactoryOptions
} from './officialApiClientFactory';
import {
  getOfficialErrorKind,
  getSourceReference,
  isOfficialClientError,
  isOfficialMapperError,
  type OfficialRecoverableErrorKind
} from './officialNotices';
import {
  parseLegislativeIdentifier,
  type NationalLegislativeIdentifier,
  type NationalLegislativeIdentifierType
} from './legislativeIdentifierParser';

export { parseDirectProposalQuery } from './legislativeIdentifierParser';

export type OfficialSearchGroup = 'parliamentarians' | 'proposals';
export type OfficialSearchSourceStatus = 'fulfilled' | 'partial' | 'failed';
export type OfficialSearchErrorKind = 'client' | 'mapper' | 'timeout' | 'unknown';
export type DirectProposalQueryType = NationalLegislativeIdentifierType;
export type DirectProposalResolution =
  | 'not-direct-query'
  | 'invalid'
  | 'single'
  | 'ambiguous'
  | 'not-found';
export type DirectProposalQuery = NationalLegislativeIdentifier;

export interface OfficialSearchRecoverableError {
  source: LegislativeSource;
  group: OfficialSearchGroup;
  kind: OfficialSearchErrorKind;
  message: string;
}

export interface OfficialSearchSourceReport {
  source: LegislativeSource;
  status: OfficialSearchSourceStatus;
  parliamentarianCount: number;
  proposalCount: number;
  errors: OfficialSearchRecoverableError[];
}

export interface OfficialSearchResult {
  query: string;
  parliamentarians: Parliamentarian[];
  proposals: LegislativeProposal[];
  sources: OfficialSearchSourceReport[];
  directProposalQuery?: DirectProposalQuery;
  directProposalError?: string;
  directProposal?: LegislativeProposal;
  directProposalResolution: DirectProposalResolution;
}

export interface OfficialSearchLimits {
  parliamentariansPerSource: number;
  proposalsPerSource: number;
}

export type OfficialCamaraSearchClient = Pick<CamaraApiClient, 'getDeputados' | 'getProposicoes'>;
export type OfficialSenadoSearchClient = Pick<
  SenadoApiClient,
  'getSenadoresAtuais' | 'searchProcessos'
>;

export interface OfficialSearchServiceOptions extends OfficialApiClientFactoryOptions {
  camaraClient?: OfficialCamaraSearchClient;
  senadoClient?: OfficialSenadoSearchClient;
  limits?: Partial<OfficialSearchLimits>;
}

interface MappedGroupResult<T> {
  items: T[];
  errors: OfficialSearchRecoverableError[];
}

interface GroupSearchResult<T> extends MappedGroupResult<T> {
  succeeded: boolean;
}

interface SourceSearchResult {
  source: LegislativeSource;
  parliamentarians: Parliamentarian[];
  proposals: LegislativeProposal[];
  errors: OfficialSearchRecoverableError[];
  succeededGroups: number;
}

export const emptyOfficialSearchResult: OfficialSearchResult = {
  query: '',
  parliamentarians: [],
  proposals: [],
  sources: [],
  directProposalResolution: 'not-direct-query'
};

const defaultLimits: OfficialSearchLimits = {
  parliamentariansPerSource: 20,
  proposalsPerSource: 20
};

const senadoOnlyDirectProposalTypes: DirectProposalQueryType[] = [
  'RQS',
  'RQN',
  'PLS',
  'PLC',
  'PRS',
  'PDS'
];

function normalizeText(value: string | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

function getQueryTokens(query: string) {
  return normalizeText(query).split(' ').filter(Boolean);
}

function normalizeProposalNumber(value: string | undefined) {
  const normalized = value?.trim().replace(/^0+(?=\d)/, '');

  return normalized || undefined;
}

function matchesQuery(query: string, fields: (string | undefined)[]) {
  const tokens = getQueryTokens(query);

  if (tokens.length === 0) {
    return false;
  }

  const searchableText = normalizeText(fields.filter(Boolean).join(' '));

  return tokens.every((token) => searchableText.includes(token));
}

function getTextMatchOrder(query: string, fields: (string | undefined)[]) {
  const normalizedQuery = normalizeText(query);
  const normalizedFields = fields.map(normalizeText).filter(Boolean);

  if (normalizedFields.some((field) => field === normalizedQuery)) {
    return 0;
  }

  if (normalizedFields.some((field) => field.startsWith(normalizedQuery))) {
    return 1;
  }

  return matchesQuery(query, normalizedFields) ? 2 : 3;
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  });
}

function getParliamentarianFields(parliamentarian: Parliamentarian) {
  return [
    parliamentarian.name,
    parliamentarian.fullName,
    parliamentarian.office,
    parliamentarian.party,
    parliamentarian.state,
    parliamentarian.status
  ];
}

function getProposalFields(proposal: LegislativeProposal) {
  return [
    proposal.title,
    proposal.type,
    proposal.number,
    proposal.year ? String(proposal.year) : undefined,
    proposal.subject,
    proposal.status,
    proposal.officialSummary
  ];
}

function matchesDirectProposalQuery(proposal: LegislativeProposal, directQuery: DirectProposalQuery) {
  const proposalType = proposal.type.toLocaleUpperCase('pt-BR');
  const proposalNumber = normalizeProposalNumber(proposal.number);

  if (proposalType !== directQuery.type || proposalNumber !== directQuery.number) {
    return false;
  }

  return directQuery.year === undefined || proposal.year === directQuery.year;
}

function filterDirectProposalMatches(
  proposals: LegislativeProposal[],
  directQuery: DirectProposalQuery | null
) {
  return directQuery
    ? proposals.filter((proposal) => matchesDirectProposalQuery(proposal, directQuery))
    : proposals;
}

function getSenadoProcessSearchOptions(query: string, directQuery: DirectProposalQuery | null) {
  if (directQuery) {
    return {
      sigla: directQuery.type,
      numero: directQuery.number,
      ano: directQuery.year
    };
  }

  return {
    termo: query
  };
}

function shouldSearchCamaraProposals(directQuery: DirectProposalQuery | null) {
  return !directQuery || !senadoOnlyDirectProposalTypes.includes(directQuery.type);
}

function sortByNeutralText<T>(
  items: T[],
  query: string,
  getFields: (item: T) => (string | undefined)[],
  getLabel: (item: T) => string,
  getId: (item: T) => string
) {
  return [...items].sort((left, right) => {
    const matchOrder =
      getTextMatchOrder(query, getFields(left)) - getTextMatchOrder(query, getFields(right));

    if (matchOrder !== 0) {
      return matchOrder;
    }

    const labelOrder = compareText(getLabel(left), getLabel(right));

    return labelOrder !== 0 ? labelOrder : compareText(getId(left), getId(right));
  });
}

function deduplicateById<T extends { id: string }>(items: T[]) {
  const seenIds = new Set<string>();
  const deduplicatedItems: T[] = [];

  for (const item of items) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      deduplicatedItems.push(item);
    }
  }

  return deduplicatedItems;
}

function getErrorKind(error: unknown): OfficialSearchErrorKind {
  return getOfficialErrorKind(error) as Exclude<
    OfficialRecoverableErrorKind,
    'unsupported-source' | 'pagination-limit'
  >;
}

function getGroupLabel(group: OfficialSearchGroup) {
  return group === 'parliamentarians' ? 'parlamentares' : 'proposições ou matérias';
}

function getErrorMessage(
  source: LegislativeSource,
  group: OfficialSearchGroup,
  error: unknown
) {
  const sourceReference = getSourceReference(source);
  const groupLabel = getGroupLabel(group);

  if (isOfficialClientError(error)) {
    if (error.kind === 'timeout') {
      return `A consulta oficial ${sourceReference} excedeu o tempo limite.`;
    }

    if (error.kind === 'invalid-payload') {
      return `Dados oficiais de ${groupLabel} ${sourceReference} vieram incompletos nesta consulta.`;
    }

    return `A fonte oficial ${sourceReference} não pode ser consultada neste momento.`;
  }

  if (isOfficialMapperError(error)) {
    return `Dados oficiais de ${groupLabel} ${sourceReference} vieram incompletos nesta consulta.`;
  }

  return `Falha temporária ao processar dados oficiais de ${groupLabel}.`;
}

function toRecoverableError(
  source: LegislativeSource,
  group: OfficialSearchGroup,
  error: unknown
): OfficialSearchRecoverableError {
  return {
    source,
    group,
    kind: getErrorKind(error),
    message: getErrorMessage(source, group, error)
  };
}

function mapPayloads<TPayload, TItem>(
  source: LegislativeSource,
  group: OfficialSearchGroup,
  payloads: TPayload[],
  mapper: (payload: TPayload) => TItem
): MappedGroupResult<TItem> {
  const items: TItem[] = [];
  const errors: OfficialSearchRecoverableError[] = [];

  for (const payload of payloads) {
    try {
      items.push(mapper(payload));
    } catch (error) {
      errors.push(toRecoverableError(source, group, error));
    }
  }

  return {
    items,
    errors
  };
}

async function searchGroup<T>(
  source: LegislativeSource,
  group: OfficialSearchGroup,
  load: () => Promise<MappedGroupResult<T>>
): Promise<GroupSearchResult<T>> {
  try {
    const result = await load();

    return {
      ...result,
      succeeded: true
    };
  } catch (error) {
    return {
      items: [],
      errors: [toRecoverableError(source, group, error)],
      succeeded: false
    };
  }
}

function buildSourceSearchResult(
  source: LegislativeSource,
  parliamentarianResult: GroupSearchResult<Parliamentarian>,
  proposalResult: GroupSearchResult<LegislativeProposal>
): SourceSearchResult {
  return {
    source,
    parliamentarians: parliamentarianResult.items,
    proposals: proposalResult.items,
    errors: [...parliamentarianResult.errors, ...proposalResult.errors],
    succeededGroups: Number(parliamentarianResult.succeeded) + Number(proposalResult.succeeded)
  };
}

function buildSourceReport(result: SourceSearchResult): OfficialSearchSourceReport {
  const status: OfficialSearchSourceStatus =
    result.errors.length === 0 ? 'fulfilled' : result.succeededGroups > 0 ? 'partial' : 'failed';

  return {
    source: result.source,
    status,
    parliamentarianCount: result.parliamentarians.length,
    proposalCount: result.proposals.length,
    errors: result.errors
  };
}

function resolveOfficialSearchClients(options: OfficialSearchServiceOptions) {
  if (options.camaraClient && options.senadoClient) {
    return {
      camaraClient: options.camaraClient,
      senadoClient: options.senadoClient
    };
  }

  const configuredClients = createOfficialApiClients(options);

  return {
    camaraClient: options.camaraClient ?? configuredClients.camaraClient,
    senadoClient: options.senadoClient ?? configuredClients.senadoClient
  };
}

async function searchCamaraSource(
  query: string,
  client: OfficialCamaraSearchClient,
  limits: OfficialSearchLimits,
  directQuery: DirectProposalQuery | null
): Promise<SourceSearchResult> {
  const parliamentarianSearch = directQuery
    ? Promise.resolve<GroupSearchResult<Parliamentarian>>({
        items: [],
        errors: [],
        succeeded: false
      })
    : searchGroup('camara', 'parliamentarians', async () =>
        mapPayloads<CamaraDeputadoPayload, Parliamentarian>(
          'camara',
          'parliamentarians',
          await client.getDeputados({
            nome: query,
            itens: limits.parliamentariansPerSource,
            ordem: 'ASC',
            ordenarPor: 'nome'
          }),
          mapCamaraDeputadoToParliamentarian
        )
      );
  const proposalSearch = shouldSearchCamaraProposals(directQuery)
    ? searchGroup('camara', 'proposals', async () => {
        const mapped = mapPayloads<CamaraProposicaoPayload, LegislativeProposal>(
          'camara',
          'proposals',
          await client.getProposicoes({
            keywords: directQuery ? undefined : query,
            siglaTipo: directQuery?.type,
            numero: directQuery?.number,
            ano: directQuery?.year,
            itens: limits.proposalsPerSource
          }),
          mapCamaraProposicaoToLegislativeProposal
        );

        return {
          items: filterDirectProposalMatches(mapped.items, directQuery),
          errors: mapped.errors
        };
      })
    : Promise.resolve<GroupSearchResult<LegislativeProposal>>({
        items: [],
        errors: [],
        succeeded: false
      });
  const [parliamentarianResult, proposalResult] = await Promise.all([
    parliamentarianSearch,
    proposalSearch
  ]);

  return buildSourceSearchResult('camara', parliamentarianResult, proposalResult);
}

async function searchSenadoSource(
  query: string,
  client: OfficialSenadoSearchClient,
  limits: OfficialSearchLimits,
  directQuery: DirectProposalQuery | null
): Promise<SourceSearchResult> {
  const parliamentarianSearch = directQuery
    ? Promise.resolve<GroupSearchResult<Parliamentarian>>({
        items: [],
        errors: [],
        succeeded: false
      })
    : searchGroup('senado', 'parliamentarians', async () => {
        const mapped = mapPayloads<SenadoSenadorPayload, Parliamentarian>(
          'senado',
          'parliamentarians',
          await client.getSenadoresAtuais(),
          mapSenadoSenadorToParliamentarian
        );

        return {
          items: mapped.items
            .filter((parliamentarian) =>
              matchesQuery(query, getParliamentarianFields(parliamentarian))
            )
            .slice(0, limits.parliamentariansPerSource),
          errors: mapped.errors
        };
      });
  const [parliamentarianResult, proposalResult] = await Promise.all([
    parliamentarianSearch,
    searchGroup('senado', 'proposals', async () => {
      const mapped = mapPayloads<SenadoProcessoPayload, LegislativeProposal>(
        'senado',
        'proposals',
        await client.searchProcessos(getSenadoProcessSearchOptions(query, directQuery)),
        mapSenadoProcessoToLegislativeProposal
      );
      const proposals = filterDirectProposalMatches(mapped.items, directQuery);

      return {
        items: proposals.slice(0, limits.proposalsPerSource),
        errors: mapped.errors
      };
    })
  ]);

  return buildSourceSearchResult('senado', parliamentarianResult, proposalResult);
}

export async function searchOfficialRecords(
  query: string,
  options: OfficialSearchServiceOptions = {}
): Promise<OfficialSearchResult> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return emptyOfficialSearchResult;
  }

  const limits = {
    ...defaultLimits,
    ...options.limits
  };
  const directProposalParseResult = parseLegislativeIdentifier(normalizedQuery);

  if (!directProposalParseResult.ok && directProposalParseResult.attempted) {
    return {
      query: normalizedQuery,
      parliamentarians: [],
      proposals: [],
      sources: [],
      directProposalError: directProposalParseResult.message,
      directProposalResolution: 'invalid'
    };
  }

  const directProposalQuery = directProposalParseResult.ok
    ? directProposalParseResult.identifier
    : null;
  const { camaraClient, senadoClient } = resolveOfficialSearchClients(options);
  const sourceResults = await Promise.all([
    searchCamaraSource(normalizedQuery, camaraClient, limits, directProposalQuery),
    searchSenadoSource(normalizedQuery, senadoClient, limits, directProposalQuery)
  ]);

  const parliamentarians = sortByNeutralText(
    deduplicateById(sourceResults.flatMap((result) => result.parliamentarians)),
    normalizedQuery,
    getParliamentarianFields,
    (parliamentarian) => parliamentarian.name,
    (parliamentarian) => parliamentarian.id
  );
  const proposals = sortByNeutralText(
    deduplicateById(sourceResults.flatMap((result) => result.proposals)),
    normalizedQuery,
    getProposalFields,
    (proposal) => proposal.title,
    (proposal) => proposal.id
  );
  const directProposalMatches = directProposalQuery
    ? proposals.filter((proposal) => matchesDirectProposalQuery(proposal, directProposalQuery))
    : [];
  const directProposalResolution: DirectProposalResolution = directProposalQuery
    ? directProposalMatches.length === 1
      ? 'single'
      : directProposalMatches.length > 1
        ? 'ambiguous'
        : 'not-found'
    : 'not-direct-query';

  return {
    query: normalizedQuery,
    parliamentarians,
    proposals,
    sources: sourceResults.map(buildSourceReport),
    directProposalQuery: directProposalQuery ?? undefined,
    directProposal:
      directProposalResolution === 'single' ? directProposalMatches[0] : undefined,
    directProposalResolution
  };
}
