import type {
  CamaraApiClient,
  CamaraDeputadoPayload,
  CamaraProposicaoPayload
} from '$lib/api/camaraClient';
import type {
  SenadoApiClient,
  SenadoProcessoPayload,
  SenadoSenadorPayload
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
  getOfficialClientErrorMessage,
  getOfficialErrorKind,
  getOfficialErrorStatus,
  getOfficialMapperErrorMessage,
  getSourceReference,
  isOfficialClientError,
  isOfficialMapperError,
  type OfficialRecoverableErrorKind
} from './officialNotices';
import {
  filterDirectProposalMatches,
  getParliamentarianFields,
  getSenadoProcessSearchOptions,
  matchesQuery,
  shouldSearchCamaraProposals,
  type DirectProposalQuery
} from './officialSearchHelpers';

export type OfficialSearchGroup = 'parliamentarians' | 'proposals';
export type OfficialSearchSourceStatus = 'fulfilled' | 'partial' | 'failed';
export type OfficialSearchErrorKind = Exclude<
  OfficialRecoverableErrorKind,
  'unsupported-source' | 'pagination-limit'
>;

export interface OfficialSearchRecoverableError {
  source: LegislativeSource;
  group: OfficialSearchGroup;
  kind: OfficialSearchErrorKind;
  message: string;
  status?: number;
}

export interface OfficialSearchSourceReport {
  source: LegislativeSource;
  status: OfficialSearchSourceStatus;
  parliamentarianCount: number;
  proposalCount: number;
  errors: OfficialSearchRecoverableError[];
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

export interface MappedGroupResult<T> {
  items: T[];
  errors: OfficialSearchRecoverableError[];
}

export interface GroupSearchResult<T> extends MappedGroupResult<T> {
  succeeded: boolean;
}

export interface SourceSearchResult {
  source: LegislativeSource;
  parliamentarians: Parliamentarian[];
  proposals: LegislativeProposal[];
  errors: OfficialSearchRecoverableError[];
  succeededGroups: number;
}

function isAbortError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
    return true;
  }

  return false;
}

function getErrorKind(error: unknown): OfficialSearchErrorKind {
  return getOfficialErrorKind(error) as Exclude<
    OfficialRecoverableErrorKind,
    'unsupported-source' | 'pagination-limit'
  >;
}

function getGroupLabel(group: OfficialSearchGroup): string {
  return group === 'parliamentarians' ? 'parlamentares' : 'proposições ou matérias';
}

function getErrorMessage(
  source: LegislativeSource,
  group: OfficialSearchGroup,
  error: unknown
): string {
  const sourceReference = getSourceReference(source);
  const groupLabel = getGroupLabel(group);

  if (isOfficialClientError(error)) {
    return getOfficialClientErrorMessage(sourceReference, groupLabel, error);
  }

  if (isOfficialMapperError(error)) {
    return getOfficialMapperErrorMessage(groupLabel, sourceReference);
  }

  return `Falha temporária ao processar dados oficiais de ${groupLabel}.`;
}

export function toRecoverableError(
  source: LegislativeSource,
  group: OfficialSearchGroup,
  error: unknown
): OfficialSearchRecoverableError {
  const status = getOfficialErrorStatus(error);

  return {
    source,
    group,
    kind: getErrorKind(error),
    message: getErrorMessage(source, group, error),
    ...(status !== undefined ? { status } : {})
  };
}

export function mapPayloads<TPayload, TItem>(
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

export async function searchGroup<T>(
  source: LegislativeSource,
  group: OfficialSearchGroup,
  load: () => Promise<MappedGroupResult<T>>,
  signal?: AbortSignal
): Promise<GroupSearchResult<T>> {
  try {
    const result = await load();

    return {
      ...result,
      succeeded: true
    };
  } catch (error) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }

    return {
      items: [],
      errors: [toRecoverableError(source, group, error)],
      succeeded: false
    };
  }
}

export function buildSourceSearchResult(
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

export function buildSourceReport(result: SourceSearchResult): OfficialSearchSourceReport {
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

export async function searchCamaraSource(
  query: string,
  client: OfficialCamaraSearchClient,
  limits: OfficialSearchLimits,
  directQuery: DirectProposalQuery | null,
  signal?: AbortSignal
): Promise<SourceSearchResult> {
  const parliamentarianSearch = directQuery
    ? Promise.resolve<GroupSearchResult<Parliamentarian>>({
        items: [],
        errors: [],
        succeeded: false
      })
    : searchGroup(
        'camara',
        'parliamentarians',
        async () =>
          mapPayloads<CamaraDeputadoPayload, Parliamentarian>(
            'camara',
            'parliamentarians',
            await client.getDeputados({
              nome: query,
              itens: limits.parliamentariansPerSource,
              ordem: 'ASC',
              ordenarPor: 'nome',
              signal
            }),
            mapCamaraDeputadoToParliamentarian
          ),
        signal
      );

  const proposalSearch = shouldSearchCamaraProposals(directQuery)
    ? searchGroup(
        'camara',
        'proposals',
        async () => {
          const mapped = mapPayloads<CamaraProposicaoPayload, LegislativeProposal>(
            'camara',
            'proposals',
            await client.getProposicoes({
              keywords: directQuery ? undefined : query,
              siglaTipo: directQuery?.type,
              numero: directQuery?.number,
              ano: directQuery?.year,
              itens: limits.proposalsPerSource,
              signal
            }),
            mapCamaraProposicaoToLegislativeProposal
          );

          return {
            items: filterDirectProposalMatches(mapped.items, directQuery),
            errors: mapped.errors
          };
        },
        signal
      )
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

export async function searchSenadoSource(
  query: string,
  client: OfficialSenadoSearchClient,
  limits: OfficialSearchLimits,
  directQuery: DirectProposalQuery | null,
  signal?: AbortSignal
): Promise<SourceSearchResult> {
  const parliamentarianSearch = directQuery
    ? Promise.resolve<GroupSearchResult<Parliamentarian>>({
        items: [],
        errors: [],
        succeeded: false
      })
    : searchGroup(
        'senado',
        'parliamentarians',
        async () => {
          const mapped = mapPayloads<SenadoSenadorPayload, Parliamentarian>(
            'senado',
            'parliamentarians',
            await client.getSenadoresAtuais({ signal }),
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
        },
        signal
      );

  const [parliamentarianResult, proposalResult] = await Promise.all([
    parliamentarianSearch,
    searchGroup(
      'senado',
      'proposals',
      async () => {
        const mapped = mapPayloads<SenadoProcessoPayload, LegislativeProposal>(
          'senado',
          'proposals',
          await client.searchProcessos({
            ...getSenadoProcessSearchOptions(query, directQuery),
            signal
          }),
          mapSenadoProcessoToLegislativeProposal
        );
        const proposals = filterDirectProposalMatches(mapped.items, directQuery);

        return {
          items: proposals.slice(0, limits.proposalsPerSource),
          errors: mapped.errors
        };
      },
      signal
    )
  ]);

  return buildSourceSearchResult('senado', parliamentarianResult, proposalResult);
}
