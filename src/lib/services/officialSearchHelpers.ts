import type { LegislativeProposal, Parliamentarian } from '$lib/domain';
import type { NationalLegislativeIdentifier, NationalLegislativeIdentifierType } from './legislativeIdentifierParser';

export type DirectProposalQuery = NationalLegislativeIdentifier;
export type DirectProposalQueryType = NationalLegislativeIdentifierType;

export const senadoOnlyDirectProposalTypes: DirectProposalQueryType[] = [
  'RQS',
  'RQN',
  'PLS',
  'PLC',
  'PRS',
  'PDS'
];

export function normalizeText(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getQueryTokens(query: string): string[] {
  return normalizeText(query).split(' ').filter(Boolean);
}

export function normalizeProposalNumber(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/^0+(?=\d)/, '');
  return normalized || undefined;
}

export function matchesQuery(query: string, fields: (string | undefined)[]): boolean {
  const tokens = getQueryTokens(query);

  if (tokens.length === 0) {
    return false;
  }

  const searchableText = normalizeText(fields.filter(Boolean).join(' '));
  return tokens.every((token) => searchableText.includes(token));
}

export function getTextMatchOrder(query: string, fields: (string | undefined)[]): number {
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

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', {
    sensitivity: 'base',
    numeric: true
  });
}

export function getParliamentarianFields(parliamentarian: Parliamentarian): (string | undefined)[] {
  return [
    parliamentarian.name,
    parliamentarian.fullName,
    parliamentarian.office,
    parliamentarian.party,
    parliamentarian.state,
    parliamentarian.status
  ];
}

export function getProposalFields(proposal: LegislativeProposal): (string | undefined)[] {
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

export function matchesDirectProposalQuery(
  proposal: LegislativeProposal,
  directQuery: DirectProposalQuery
): boolean {
  const proposalType = proposal.type.toLocaleUpperCase('pt-BR');
  const proposalNumber = normalizeProposalNumber(proposal.number);

  if (proposalType !== directQuery.type || proposalNumber !== directQuery.number) {
    return false;
  }

  return directQuery.year === undefined || proposal.year === directQuery.year;
}

export function filterDirectProposalMatches(
  proposals: LegislativeProposal[],
  directQuery: DirectProposalQuery | null
): LegislativeProposal[] {
  return directQuery
    ? proposals.filter((proposal) => matchesDirectProposalQuery(proposal, directQuery))
    : proposals;
}

export function getSenadoProcessSearchOptions(
  query: string,
  directQuery: DirectProposalQuery | null
): { sigla?: string; numero?: string; ano?: number; termo?: string } {
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

export function shouldSearchCamaraProposals(directQuery: DirectProposalQuery | null): boolean {
  return !directQuery || !senadoOnlyDirectProposalTypes.includes(directQuery.type);
}

export function sortByNeutralText<T>(
  items: T[],
  query: string,
  getFields: (item: T) => (string | undefined)[],
  getLabel: (item: T) => string,
  getId: (item: T) => string
): T[] {
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

export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
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
