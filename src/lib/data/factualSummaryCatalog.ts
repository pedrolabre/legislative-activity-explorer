export interface FactualSummaryCatalogEntry {
  proposalId: string;
  summary: string;
  checkedAt: string;
}

export const factualSummaryCatalog: FactualSummaryCatalogEntry[] = [
  {
    proposalId: 'bill-pl-1234-2024',
    summary:
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.',
    checkedAt: '2026-06-29'
  },
  {
    proposalId: 'bill-pec-45-2023',
    summary:
      'A proposição trata de dispositivos constitucionais relacionados ao financiamento de ações públicas de saúde.',
    checkedAt: '2026-06-29'
  }
];

export function getFactualSummaryCatalogEntryByProposalId(
  proposalId: string
): FactualSummaryCatalogEntry | undefined {
  return factualSummaryCatalog.find((entry) => entry.proposalId === proposalId);
}

export function getReviewedFactualSummaryByProposalId(
  proposalId: string
): string | undefined {
  return getFactualSummaryCatalogEntryByProposalId(proposalId)?.summary;
}
