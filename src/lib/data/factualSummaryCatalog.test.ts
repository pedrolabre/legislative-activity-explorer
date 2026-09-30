import { describe, expect, it } from 'vitest';
import {
  factualSummaryCatalog,
  findFactualSummaryCatalogEntry,
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

  it('keeps canonical IDs and aliases populated for all catalog entries', () => {
    for (const entry of factualSummaryCatalog) {
      expect(entry.canonicalId).toBeDefined();
      expect(entry.canonicalId?.trim()).toBe(entry.canonicalId);
      expect(entry.aliases).toBeDefined();
      expect(entry.aliases?.length).toBeGreaterThan(0);
      for (const alias of entry.aliases ?? []) {
        expect(alias.trim()).toBe(alias);
        expect(alias).not.toBe('');
      }
    }
  });

  it('keeps one reviewed summary per proposal id and canonical id', () => {
    const proposalIds = factualSummaryCatalog.map((entry) => entry.proposalId);
    expect(new Set(proposalIds).size).toBe(proposalIds.length);

    const canonicalIds = factualSummaryCatalog.map((entry) => entry.canonicalId);
    expect(new Set(canonicalIds).size).toBe(canonicalIds.length);
  });

  it('returns reviewed summaries by legacy proposal id', () => {
    expect(getFactualSummaryCatalogEntryByProposalId('bill-pl-1234-2024')).toMatchObject({
      checkedAt: '2026-06-29'
    });
    expect(getReviewedFactualSummaryByProposalId('bill-pl-1234-2024')).toContain(
      'informações educacionais'
    );
    expect(getReviewedFactualSummaryByProposalId('proposal-sem-resumo')).toBeUndefined();
  });

  it('resolves catalog entries by canonical slug and legislative notations', () => {
    expect(getReviewedFactualSummaryByProposalId('pl-1234-2024')).toContain(
      'informações educacionais'
    );
    expect(getReviewedFactualSummaryByProposalId('PL 1234/2024')).toContain(
      'informações educacionais'
    );
    expect(getReviewedFactualSummaryByProposalId('pl 1234/2024')).toContain(
      'informações educacionais'
    );
    expect(getReviewedFactualSummaryByProposalId('pec-45-2023')).toContain(
      'financiamento de ações públicas de saúde'
    );
    expect(getReviewedFactualSummaryByProposalId('PEC 45/2023')).toContain(
      'financiamento de ações públicas de saúde'
    );
  });

  it('resolves catalog entries by official house aliases', () => {
    expect(getReviewedFactualSummaryByProposalId('camara-proposicao-1234')).toContain(
      'informações educacionais'
    );
    expect(getReviewedFactualSummaryByProposalId('senado-materia-45')).toContain(
      'financiamento de ações públicas de saúde'
    );
    expect(getReviewedFactualSummaryByProposalId('senado-processo-45')).toContain(
      'financiamento de ações públicas de saúde'
    );
  });

  it('resolves entries using structured proposal lookup objects', () => {
    const camaraLookup = findFactualSummaryCatalogEntry({
      id: 'camara-proposicao-1234',
      type: 'PL',
      number: '1234',
      year: 2024
    });
    expect(camaraLookup?.summary).toContain('informações educacionais');

    const senadoLookup = findFactualSummaryCatalogEntry({
      id: 'senado-materia-45',
      type: 'PEC',
      number: '45',
      year: 2023
    });
    expect(senadoLookup?.summary).toContain('financiamento de ações públicas de saúde');

    const uncatalogedLookup = findFactualSummaryCatalogEntry({
      id: 'camara-proposicao-9999',
      type: 'PL',
      number: '9999',
      year: 2099
    });
    expect(uncatalogedLookup).toBeUndefined();
  });

  it('does not include known value-laden language in factual summaries', () => {
    for (const entry of factualSummaryCatalog) {
      expect(containsKnownValueLanguage(entry.summary)).toBe(false);
    }
  });
});
