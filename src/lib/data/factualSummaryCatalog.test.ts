import { describe, expect, it } from 'vitest';
import {
  factualSummaryCatalog,
  getFactualSummaryCatalogEntryByProposalId,
  getReviewedFactualSummaryByProposalId
} from './factualSummaryCatalog';

const checkedAtPattern = /^\d{4}-\d{2}-\d{2}$/;
const knownValueLanguage = [
  'excelente',
  'horrivel',
  'vergonhoso',
  'vergonhosa',
  'absurdo',
  'melhor',
  'pior',
  'bom',
  'ruim',
  'correto',
  'errado',
  'heroi',
  'vilao',
  'recomendado',
  'grave'
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function containsKnownValueLanguage(value: string) {
  const normalizedValue = normalizeText(value);

  return knownValueLanguage.some((term) =>
    new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, 'i').test(normalizedValue)
  );
}

describe('factualSummaryCatalog', () => {
  it('keeps reviewed factual summaries associated with proposals', () => {
    expect(factualSummaryCatalog.length).toBeGreaterThan(0);

    for (const entry of factualSummaryCatalog) {
      expect(entry.proposalId.trim()).toBe(entry.proposalId);
      expect(entry.proposalId).not.toBe('');
      expect(entry.summary.trim()).toBe(entry.summary);
      expect(entry.summary).not.toBe('');
      expect(entry.checkedAt).toMatch(checkedAtPattern);
      expect(Number.isNaN(Date.parse(entry.checkedAt))).toBe(false);
    }
  });

  it('keeps one reviewed summary per proposal id', () => {
    const proposalIds = factualSummaryCatalog.map((entry) => entry.proposalId);

    expect(new Set(proposalIds).size).toBe(proposalIds.length);
  });

  it('returns reviewed summaries by proposal id', () => {
    expect(getFactualSummaryCatalogEntryByProposalId('bill-pl-1234-2024')).toMatchObject({
      checkedAt: '2026-06-29'
    });
    expect(getReviewedFactualSummaryByProposalId('bill-pl-1234-2024')).toContain(
      'informações educacionais'
    );
    expect(getReviewedFactualSummaryByProposalId('proposal-sem-resumo')).toBeUndefined();
  });

  it('does not include known value-laden language in factual summaries', () => {
    for (const entry of factualSummaryCatalog) {
      expect(containsKnownValueLanguage(entry.summary)).toBe(false);
    }
  });
});
