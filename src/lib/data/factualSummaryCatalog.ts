export interface FactualSummaryCatalogEntry {
  proposalId: string;
  canonicalId?: string;
  aliases?: readonly string[];
  summary: string;
  checkedAt: string;
}

export interface ProposalLookupTarget {
  id?: string;
  type?: string;
  number?: string | number;
  year?: number | string;
  title?: string;
  source?: string;
  sourceId?: string;
}

export type ProposalLookupInput = string | ProposalLookupTarget;

export const factualSummaryCatalog: FactualSummaryCatalogEntry[] = [
  {
    proposalId: 'bill-pl-1234-2024',
    canonicalId: 'pl-1234-2024',
    aliases: ['camara-proposicao-1234', 'PL 1234/2024', 'PL 1234'],
    summary:
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.',
    checkedAt: '2026-06-29'
  },
  {
    proposalId: 'bill-pec-45-2023',
    canonicalId: 'pec-45-2023',
    aliases: ['senado-materia-45', 'senado-processo-45', 'PEC 45/2023', 'PEC 45'],
    summary:
      'A proposição trata de dispositivos constitucionais relacionados ao financiamento de ações públicas de saúde.',
    checkedAt: '2026-06-29'
  }
];

const legacyBillPattern = /^bill-([a-zA-Z]{2,5})-(\d+)(?:-(\d{4}))?$/i;
const legislativeNotationPattern = /^([a-zA-Z]{2,5})[- /]+(\d+)(?:[- /]+(\d{4}))?$/;

export function normalizeCatalogToken(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function buildCanonicalProposalSlug(
  type?: string,
  number?: string | number,
  year?: string | number
): string | undefined {
  if (!type || !number) {
    return undefined;
  }

  const normalizedType = String(type).trim().toLowerCase();
  const normalizedNumber = String(number).trim().replace(/^0+(?=\d)/, '');

  if (!normalizedType || !normalizedNumber) {
    return undefined;
  }

  const normalizedYear =
    year !== undefined && year !== null && String(year).trim() !== ''
      ? String(year).trim()
      : undefined;

  return normalizedYear
    ? `${normalizedType}-${normalizedNumber}-${normalizedYear}`
    : `${normalizedType}-${normalizedNumber}`;
}

export function buildLegacyProposalSlug(
  type?: string,
  number?: string | number,
  year?: string | number
): string | undefined {
  const canonical = buildCanonicalProposalSlug(type, number, year);
  return canonical ? `bill-${canonical}` : undefined;
}

export function formatLegislativeIdentifier(
  type?: string,
  number?: string | number,
  year?: string | number
): string | undefined {
  if (!type || !number) {
    return undefined;
  }

  const normalizedType = String(type).trim().toUpperCase();
  const normalizedNumber = String(number).trim().replace(/^0+(?=\d)/, '');

  if (!normalizedType || !normalizedNumber) {
    return undefined;
  }

  const normalizedYear =
    year !== undefined && year !== null && String(year).trim() !== ''
      ? String(year).trim()
      : undefined;

  return normalizedYear
    ? `${normalizedType} ${normalizedNumber}/${normalizedYear}`
    : `${normalizedType} ${normalizedNumber}`;
}

export function generateProposalLookupCandidates(lookup: ProposalLookupInput): string[] {
  const candidates = new Set<string>();

  const addCandidate = (val: string | undefined | null) => {
    if (!val) {
      return;
    }
    const trimmed = String(val).trim();
    if (trimmed) {
      candidates.add(trimmed);
      candidates.add(normalizeCatalogToken(trimmed));
    }
  };

  if (typeof lookup === 'string') {
    addCandidate(lookup);

    const legacyMatch = lookup.match(legacyBillPattern);
    if (legacyMatch) {
      const [, type, number, year] = legacyMatch;
      addCandidate(buildCanonicalProposalSlug(type, number, year));
      addCandidate(formatLegislativeIdentifier(type, number, year));
    }

    const notationMatch = lookup.match(legislativeNotationPattern);
    if (notationMatch) {
      const [, type, number, year] = notationMatch;
      addCandidate(buildCanonicalProposalSlug(type, number, year));
      addCandidate(buildLegacyProposalSlug(type, number, year));
      addCandidate(formatLegislativeIdentifier(type, number, year));
    }

    return Array.from(candidates);
  }

  addCandidate(lookup.id);

  if (lookup.type && lookup.number) {
    addCandidate(buildCanonicalProposalSlug(lookup.type, lookup.number, lookup.year));
    addCandidate(buildLegacyProposalSlug(lookup.type, lookup.number, lookup.year));
    addCandidate(formatLegislativeIdentifier(lookup.type, lookup.number, lookup.year));
  }

  if (lookup.title) {
    addCandidate(lookup.title);
    const titleNotation = lookup.title.match(legislativeNotationPattern);
    if (titleNotation) {
      const [, type, number, year] = titleNotation;
      addCandidate(buildCanonicalProposalSlug(type, number, year));
      addCandidate(buildLegacyProposalSlug(type, number, year));
      addCandidate(formatLegislativeIdentifier(type, number, year));
    }
  }

  if (lookup.source && lookup.sourceId) {
    addCandidate(`${lookup.source}-${lookup.sourceId}`);
    addCandidate(`${lookup.source}-proposicao-${lookup.sourceId}`);
    addCandidate(`${lookup.source}-materia-${lookup.sourceId}`);
    addCandidate(`${lookup.source}-processo-${lookup.sourceId}`);
  }

  return Array.from(candidates);
}

export function matchesCatalogEntry(
  entry: { proposalId: string; canonicalId?: string; aliases?: readonly string[] },
  candidateTokens: Set<string>
): boolean {
  const entryKeys = [
    entry.proposalId,
    ...(entry.canonicalId ? [entry.canonicalId] : []),
    ...(entry.aliases ?? [])
  ];

  for (const key of entryKeys) {
    const raw = key.trim();
    const normalized = normalizeCatalogToken(key);
    if (candidateTokens.has(raw) || candidateTokens.has(normalized)) {
      return true;
    }
  }

  return false;
}

export function findFactualSummaryCatalogEntry(
  lookup: ProposalLookupInput
): FactualSummaryCatalogEntry | undefined {
  const candidateTokens = new Set(generateProposalLookupCandidates(lookup));

  return factualSummaryCatalog.find((entry) => matchesCatalogEntry(entry, candidateTokens));
}

export function getFactualSummaryCatalogEntryByProposalId(
  proposalId: string
): FactualSummaryCatalogEntry | undefined {
  return findFactualSummaryCatalogEntry(proposalId);
}

export function getReviewedFactualSummaryByProposalId(
  proposalId: string
): string | undefined {
  return findFactualSummaryCatalogEntry(proposalId)?.summary;
}
