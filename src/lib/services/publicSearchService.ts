import {
  searchOfficialRecords,
  type OfficialSearchResult,
  type OfficialSearchServiceOptions,
  type OfficialSearchSourceReport
} from './officialSearchService';
import { getSourceReference } from './officialNotices';
import type { SearchResults } from './searchService';

function formatReferenceList(references: string[]) {
  if (references.length <= 1) {
    return references[0] ?? '';
  }

  return `${references.slice(0, -1).join(', ')} e ${references.at(-1)}`;
}

function hasSearchResults(result: OfficialSearchResult) {
  return result.parliamentarians.length > 0 || result.proposals.length > 0;
}

function getReportsWithErrors(result: OfficialSearchResult) {
  return result.sources.filter((source) => source.errors.length > 0);
}

function getSourceReferences(reports: OfficialSearchSourceReport[]) {
  return reports.map((report) => getSourceReference(report.source));
}

export function getOfficialSearchRecoverableMessage(result: OfficialSearchResult) {
  const reportsWithErrors = getReportsWithErrors(result);

  if (reportsWithErrors.length === 0) {
    return '';
  }

  const failedReports = reportsWithErrors.filter((report) => report.status === 'failed');
  const partialReports = reportsWithErrors.filter((report) => report.status === 'partial');
  const hasResults = hasSearchResults(result);
  const suffix = hasResults
    ? 'Os resultados retornados foram exibidos.'
    : 'A busca pode ser repetida mais tarde.';

  if (failedReports.length === result.sources.length && !hasResults) {
    return 'As fontes oficiais da Câmara dos Deputados e do Senado Federal não puderam ser consultadas neste momento. Tente novamente mais tarde.';
  }

  if (failedReports.length > 0) {
    const failedReferences = formatReferenceList(getSourceReferences(failedReports));

    return failedReports.length === 1
      ? `A fonte oficial ${failedReferences} não pôde ser consultada neste momento. ${suffix}`
      : `As fontes oficiais ${failedReferences} não puderam ser consultadas neste momento. ${suffix}`;
  }

  if (partialReports.length > 0) {
    const partialReferences = formatReferenceList(getSourceReferences(partialReports));

    return `Dados oficiais ${partialReferences} vieram incompletos nesta consulta. ${suffix}`;
  }

  return reportsWithErrors[0]?.errors[0]?.message ?? '';
}

export async function searchPublicRecords(
  query: string,
  options: OfficialSearchServiceOptions = {}
): Promise<SearchResults> {
  const result = await searchOfficialRecords(query, options);

  return {
    parliamentarians: result.parliamentarians,
    proposals: result.proposals,
    recoverableMessage: getOfficialSearchRecoverableMessage(result)
  };
}
