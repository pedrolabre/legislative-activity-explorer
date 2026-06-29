import {
  CamaraApiClient,
  CamaraApiClientError,
  type CamaraDeputadoPayload,
  type CamaraProposicaoPayload
} from '$lib/api/camaraClient';
import {
  SenadoApiClient,
  SenadoApiClientError,
  type SenadoMateriaPayload,
  type SenadoSenadorPayload
} from '$lib/api/senadoClient';
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

export type OfficialSearchGroup = 'parliamentarians' | 'proposals';
export type OfficialSearchSourceStatus = 'fulfilled' | 'partial' | 'failed';
export type OfficialSearchErrorKind = 'client' | 'mapper' | 'timeout' | 'unknown';

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
}

export interface OfficialSearchLimits {
  parliamentariansPerSource: number;
  proposalsPerSource: number;
}

export type OfficialCamaraSearchClient = Pick<CamaraApiClient, 'getDeputados' | 'getProposicoes'>;
export type OfficialSenadoSearchClient = Pick<
  SenadoApiClient,
  'getSenadoresAtuais' | 'searchMaterias'
>;

export interface OfficialSearchServiceOptions {
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
  sources: []
};

const defaultLimits: OfficialSearchLimits = {
  parliamentariansPerSource: 20,
  proposalsPerSource: 20
};

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

function isOfficialClientError(
  error: unknown
): error is CamaraApiClientError | SenadoApiClientError {
  return error instanceof CamaraApiClientError || error instanceof SenadoApiClientError;
}

function getErrorKind(error: unknown): OfficialSearchErrorKind {
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

function getGroupLabel(group: OfficialSearchGroup) {
  return group === 'parliamentarians' ? 'parlamentares' : 'proposicoes ou materias';
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
      return `A fonte oficial ${sourceReference} retornou dados incompletos nesta consulta.`;
    }

    return `A fonte oficial ${sourceReference} nao pode ser consultada neste momento.`;
  }

  if (error instanceof CamaraMapperError || error instanceof SenadoMapperError) {
    return `Parte dos dados oficiais de ${groupLabel} ${sourceReference} veio incompleta e nao foi exibida.`;
  }

  return `Falha temporaria ao processar dados oficiais de ${groupLabel}.`;
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

async function searchCamaraSource(
  query: string,
  client: OfficialCamaraSearchClient,
  limits: OfficialSearchLimits
): Promise<SourceSearchResult> {
  const [parliamentarianResult, proposalResult] = await Promise.all([
    searchGroup('camara', 'parliamentarians', async () =>
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
    ),
    searchGroup('camara', 'proposals', async () =>
      mapPayloads<CamaraProposicaoPayload, LegislativeProposal>(
        'camara',
        'proposals',
        await client.getProposicoes({
          keywords: query,
          itens: limits.proposalsPerSource
        }),
        mapCamaraProposicaoToLegislativeProposal
      )
    )
  ]);

  return buildSourceSearchResult('camara', parliamentarianResult, proposalResult);
}

async function searchSenadoSource(
  query: string,
  client: OfficialSenadoSearchClient,
  limits: OfficialSearchLimits
): Promise<SourceSearchResult> {
  const [parliamentarianResult, proposalResult] = await Promise.all([
    searchGroup('senado', 'parliamentarians', async () => {
      const mapped = mapPayloads<SenadoSenadorPayload, Parliamentarian>(
        'senado',
        'parliamentarians',
        await client.getSenadoresAtuais(),
        mapSenadoSenadorToParliamentarian
      );

      return {
        items: mapped.items
          .filter((parliamentarian) => matchesQuery(query, getParliamentarianFields(parliamentarian)))
          .slice(0, limits.parliamentariansPerSource),
        errors: mapped.errors
      };
    }),
    searchGroup('senado', 'proposals', async () => {
      const mapped = mapPayloads<SenadoMateriaPayload, LegislativeProposal>(
        'senado',
        'proposals',
        await client.searchMaterias({
          termo: query
        }),
        mapSenadoMateriaToLegislativeProposal
      );

      return {
        items: mapped.items.slice(0, limits.proposalsPerSource),
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
  const camaraClient = options.camaraClient ?? new CamaraApiClient();
  const senadoClient = options.senadoClient ?? new SenadoApiClient();
  const sourceResults = await Promise.all([
    searchCamaraSource(normalizedQuery, camaraClient, limits),
    searchSenadoSource(normalizedQuery, senadoClient, limits)
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

  return {
    query: normalizedQuery,
    parliamentarians,
    proposals,
    sources: sourceResults.map(buildSourceReport)
  };
}
