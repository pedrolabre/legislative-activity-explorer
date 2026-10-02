import type { LegislativeProposal, Parliamentarian } from '$lib/domain';
import {
  createOfficialApiClients,
  type OfficialApiClientFactoryOptions
} from './officialApiClientFactory';
import {
  parseLegislativeIdentifier
} from './legislativeIdentifierParser';
import {
  deduplicateById,
  getParliamentarianFields,
  getProposalFields,
  matchesDirectProposalQuery,
  sortByNeutralText,
  type DirectProposalQuery,
  type DirectProposalQueryType
} from './officialSearchHelpers';
import {
  buildSourceReport,
  searchCamaraSource,
  searchSenadoSource,
  type OfficialCamaraSearchClient,
  type OfficialSearchErrorKind,
  type OfficialSearchGroup,
  type OfficialSearchLimits,
  type OfficialSearchRecoverableError,
  type OfficialSearchSourceReport,
  type OfficialSearchSourceStatus,
  type OfficialSenadoSearchClient
} from './officialSearchAdapters';

export { parseDirectProposalQuery } from './legislativeIdentifierParser';

export type {
  OfficialSearchGroup,
  OfficialSearchSourceStatus,
  OfficialSearchErrorKind,
  DirectProposalQueryType,
  DirectProposalQuery,
  OfficialSearchRecoverableError,
  OfficialSearchSourceReport,
  OfficialSearchLimits,
  OfficialCamaraSearchClient,
  OfficialSenadoSearchClient
};

export type DirectProposalResolution =
  | 'not-direct-query'
  | 'invalid'
  | 'single'
  | 'ambiguous'
  | 'not-found';

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

export interface OfficialSearchServiceOptions extends OfficialApiClientFactoryOptions {
  camaraClient?: OfficialCamaraSearchClient;
  senadoClient?: OfficialSenadoSearchClient;
  limits?: Partial<OfficialSearchLimits>;
  signal?: AbortSignal;
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

export async function searchOfficialRecords(
  query: string,
  options: OfficialSearchServiceOptions = {}
): Promise<OfficialSearchResult> {
  if (options.signal?.aborted) {
    throw (
      options.signal.reason ??
      new DOMException('A consulta foi cancelada.', 'AbortError')
    );
  }

  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return emptyOfficialSearchResult;
  }

  const limits: OfficialSearchLimits = {
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
    searchCamaraSource(
      normalizedQuery,
      camaraClient,
      limits,
      directProposalQuery,
      options.signal
    ),
    searchSenadoSource(
      normalizedQuery,
      senadoClient,
      limits,
      directProposalQuery,
      options.signal
    )
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

  const directProposalError =
    directProposalResolution === 'ambiguous'
      ? 'Mais de uma proposição oficial corresponde aos termos identificados. Selecione um dos resultados abaixo.'
      : directProposalResolution === 'not-found'
        ? 'Nenhuma proposição oficial foi localizada com a identificação informada.'
        : undefined;

  return {
    query: normalizedQuery,
    parliamentarians,
    proposals,
    sources: sourceResults.map(buildSourceReport),
    directProposalQuery: directProposalQuery ?? undefined,
    directProposal:
      directProposalResolution === 'single' ? directProposalMatches[0] : undefined,
    directProposalResolution,
    ...(directProposalError ? { directProposalError } : {})
  };
}
