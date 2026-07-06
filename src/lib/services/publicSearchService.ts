import {
  searchOfficialRecords,
  type OfficialSearchErrorKind,
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

function joinMessages(messages: string[]) {
  return messages.filter(Boolean).join(' ');
}

function getReportErrorKinds(reports: OfficialSearchSourceReport[]) {
  return reports.flatMap((report) => report.errors.map((error) => error.kind));
}

function getCommonErrorKind(
  reports: OfficialSearchSourceReport[]
): OfficialSearchErrorKind | undefined {
  const kinds = getReportErrorKinds(reports);
  const firstKind = kinds[0];

  if (!firstKind || kinds.some((kind) => kind !== firstKind)) {
    return undefined;
  }

  return firstKind;
}

function getCommonSourceMessage(reports: OfficialSearchSourceReport[]) {
  const kind = getCommonErrorKind(reports);
  const references = formatReferenceList(getSourceReferences(reports));
  const isSingleSource = reports.length === 1;

  if (!kind) {
    return '';
  }

  if (kind === 'timeout') {
    return isSingleSource
      ? `A consulta oficial ${references} excedeu o tempo limite.`
      : `As consultas oficiais ${references} excederam o tempo limite.`;
  }

  if (kind === 'official-unavailable') {
    return isSingleSource
      ? `A fonte oficial ${references} informou indisponibilidade temporária.`
      : `As fontes oficiais ${references} informaram indisponibilidade temporária.`;
  }

  if (kind === 'http') {
    return isSingleSource
      ? `A fonte oficial ${references} retornou uma falha HTTP nesta consulta.`
      : `As fontes oficiais ${references} retornaram falha HTTP nesta consulta.`;
  }

  if (kind === 'invalid-payload') {
    return `Dados oficiais ${references} vieram em formato inesperado nesta consulta.`;
  }

  if (kind === 'mapper') {
    return `Dados oficiais ${references} vieram incompletos nesta consulta.`;
  }

  if (kind === 'network') {
    return isSingleSource
      ? `A fonte oficial ${references} não pôde ser consultada neste momento.`
      : `As fontes oficiais ${references} não puderam ser consultadas neste momento.`;
  }

  return '';
}

export function getDirectProposalSearchMessage(result: OfficialSearchResult) {
  if (result.directProposalResolution === 'invalid') {
    return result.directProposalError ?? 'Identificador legislativo não reconhecido nesta busca.';
  }

  if (!result.directProposalQuery) {
    return '';
  }

  if (result.directProposalResolution === 'ambiguous') {
    return `Mais de uma proposição oficial corresponde a ${result.directProposalQuery.label}. Informe o ano ou selecione um resultado oficial exibido.`;
  }

  if (result.directProposalResolution === 'not-found') {
    return `Nenhuma proposição oficial foi encontrada para ${result.directProposalQuery.label} nas fontes consultadas. Confira tipo, número e ano.`;
  }

  return '';
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
    const sourceMessage = getCommonSourceMessage(failedReports);

    return sourceMessage
      ? `${sourceMessage} Tente novamente mais tarde.`
      : 'As fontes oficiais da Câmara dos Deputados e do Senado Federal não puderam ser consultadas neste momento. Tente novamente mais tarde.';
  }

  if (failedReports.length > 0) {
    const sourceMessage = getCommonSourceMessage(failedReports);

    if (sourceMessage) {
      return `${sourceMessage} ${suffix}`;
    }

    const failedReferences = formatReferenceList(getSourceReferences(failedReports));

    return failedReports.length === 1
      ? `A fonte oficial ${failedReferences} não pôde ser consultada neste momento. ${suffix}`
      : `As fontes oficiais ${failedReferences} não puderam ser consultadas neste momento. ${suffix}`;
  }

  if (partialReports.length > 0) {
    const sourceMessage = getCommonSourceMessage(partialReports);

    if (sourceMessage) {
      return `${sourceMessage} ${suffix}`;
    }

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
    directProposal: result.directProposal,
    recoverableMessage: joinMessages([
      getDirectProposalSearchMessage(result),
      getOfficialSearchRecoverableMessage(result)
    ])
  };
}
