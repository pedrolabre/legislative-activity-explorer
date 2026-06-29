import { describe, expect, it } from 'vitest';
import type { LegislativeProposal } from '$lib/domain';
import {
  attachEditorialReferencesToProposal,
  getEditorialReferencesForProposal,
  getMissingReviewedReferenceTypes,
  hasCompleteReviewedReferenceSet
} from './referenceService';

function createProposal(
  overrides: Partial<LegislativeProposal> = {}
): LegislativeProposal {
  return {
    id: 'bill-pl-1234-2024',
    source: 'camara',
    sourceId: 'bill-pl-1234-2024',
    title: 'PL 1234/2024',
    type: 'PL',
    references: [],
    ...overrides
  };
}

describe('referenceService', () => {
  it('prioritizes reviewed catalog references for the editorial source set', () => {
    const proposal = createProposal({
      references: [
        {
          id: 'legacy-official',
          type: 'official',
          title: 'Fonte oficial anterior',
          publisher: 'Camara dos Deputados',
          url: 'https://www.camara.leg.br/propostas-legislativas/1234'
        },
        {
          id: 'legacy-technical',
          type: 'technical',
          title: 'Referencia tecnica anterior',
          publisher: 'Camara dos Deputados',
          url: 'https://www2.camara.leg.br/atividade-legislativa/estudos-e-notas-tecnicas'
        }
      ]
    });

    const enrichedProposal = attachEditorialReferencesToProposal(proposal);

    expect(enrichedProposal).not.toBe(proposal);
    expect(enrichedProposal.references.map((reference) => reference.type)).toEqual([
      'official',
      'press',
      'technical'
    ]);
    expect(enrichedProposal.references.map((reference) => reference.id)).toEqual([
      'bill-pl-1234-2024-official-camara',
      'bill-pl-1234-2024-press-politica-g1',
      'bill-pl-1234-2024-technical-estudos-camara'
    ]);
    expect(hasCompleteReviewedReferenceSet(enrichedProposal.references)).toBe(true);
    expect(proposal.references.map((reference) => reference.id)).toEqual([
      'legacy-official',
      'legacy-technical'
    ]);
  });

  it('uses existing proposal references when the catalog does not cover the proposal', () => {
    const proposal = createProposal({
      id: 'proposal-without-catalog-entry',
      references: [
        {
          id: 'official-reference',
          type: 'official',
          title: 'Pagina oficial da proposicao',
          publisher: 'Camara dos Deputados',
          url: 'https://www.camara.leg.br/propostas-legislativas/999'
        },
        {
          id: 'press-reference',
          type: 'press',
          title: 'Cobertura informativa',
          publisher: 'Veiculo de imprensa',
          url: 'https://example.com/politica/proposicao',
          checkedAt: '2026-06-29'
        }
      ]
    });

    const references = getEditorialReferencesForProposal(proposal);

    expect(references.map((reference) => reference.id)).toEqual([
      'official-reference',
      'press-reference'
    ]);
    expect(getMissingReviewedReferenceTypes(references)).toEqual(['official', 'technical']);
    expect(hasCompleteReviewedReferenceSet(references)).toBe(false);
  });

  it('reports missing reviewed reference types for partially reviewed catalog entries', () => {
    const proposal = attachEditorialReferencesToProposal(
      createProposal({
        id: 'bill-pl-220-2025',
        title: 'PL 220/2025',
        references: []
      })
    );

    expect(proposal.references.map((reference) => reference.type)).toEqual(['official']);
    expect(getMissingReviewedReferenceTypes(proposal.references)).toEqual(['press', 'technical']);
    expect(hasCompleteReviewedReferenceSet(proposal.references)).toBe(false);
  });
});
