import { describe, expect, it } from 'vitest';
import type { LegislativeProposal } from '$lib/domain';
import {
  attachEditorialReferencesToProposal,
  attachEditorialReferencesToProposals,
  getEditorialReferencesForProposal,
  getMissingReviewedReferenceTypes,
  hasCompleteReviewedReferenceSet,
  hasReviewedExternalReferences
} from './referenceService';

function createProposal(
  overrides: Partial<LegislativeProposal> = {}
): LegislativeProposal {
  const isDefault = !overrides.id || overrides.id === 'bill-pl-1234-2024';

  return {
    id: 'bill-pl-1234-2024',
    origin: 'official',
    source: 'camara',
    sourceId: isDefault ? '1234' : '9999',
    title: isDefault ? 'PL 1234/2024' : 'Proposição não catalogada',
    type: isDefault ? 'PL' : 'OUTRO',
    number: isDefault ? '1234' : '9999',
    year: isDefault ? 2024 : 2099,
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

  it('attaches editorial references automatically to official Camara proposals by house id', () => {
    const proposal = createProposal({
      id: 'camara-proposicao-1234',
      sourceId: '1234',
      title: 'PL 1234/2024',
      type: 'PL',
      number: '1234',
      year: 2024
    });

    const enrichedProposal = attachEditorialReferencesToProposal(proposal);

    expect(enrichedProposal.references.map((ref) => ref.id)).toEqual([
      'bill-pl-1234-2024-official-camara',
      'bill-pl-1234-2024-press-politica-g1',
      'bill-pl-1234-2024-technical-estudos-camara'
    ]);
    expect(hasCompleteReviewedReferenceSet(enrichedProposal.references)).toBe(true);
  });

  it('attaches editorial references automatically to official Senado proposals by house id', () => {
    const proposal = createProposal({
      id: 'senado-materia-45',
      source: 'senado',
      sourceId: '45',
      title: 'PEC 45/2023',
      type: 'PEC',
      number: '45',
      year: 2023
    });

    const enrichedProposal = attachEditorialReferencesToProposal(proposal);

    expect(enrichedProposal.references.map((ref) => ref.id)).toEqual([
      'bill-pec-45-2023-official-senado',
      'bill-pec-45-2023-press-agencia-senado',
      'bill-pec-45-2023-technical-estudos-senado'
    ]);
    expect(hasCompleteReviewedReferenceSet(enrichedProposal.references)).toBe(true);
  });

  it('resolves catalog references using structured fields when proposal id is an arbitrary domain id', () => {
    const proposal = createProposal({
      id: 'camara-proposicao-arbitrary-555',
      sourceId: '555',
      title: 'PL 1234/2024',
      type: 'PL',
      number: '1234',
      year: 2024
    });

    const enrichedProposal = attachEditorialReferencesToProposal(proposal);

    expect(enrichedProposal.references.map((ref) => ref.id)).toEqual([
      'bill-pl-1234-2024-official-camara',
      'bill-pl-1234-2024-press-politica-g1',
      'bill-pl-1234-2024-technical-estudos-camara'
    ]);
  });

  it('uses existing proposal references when the catalog does not cover the proposal', () => {
    const proposal = createProposal({
      id: 'proposal-without-catalog-entry',
      title: 'PL 9999/2099',
      number: '9999',
      year: 2099,
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
    expect(getMissingReviewedReferenceTypes(references)).toEqual(['technical']);
    expect(hasReviewedExternalReferences(references)).toBe(true);
    expect(hasCompleteReviewedReferenceSet(references)).toBe(false);
  });

  it('reports missing reviewed reference types for partially reviewed catalog entries', () => {
    const proposal = attachEditorialReferencesToProposal(
      createProposal({
        id: 'bill-pl-220-2025',
        title: 'PL 220/2025',
        type: 'PL',
        number: '220',
        year: 2025,
        references: []
      })
    );

    expect(proposal.references.map((reference) => reference.type)).toEqual(['official']);
    expect(getMissingReviewedReferenceTypes(proposal.references)).toEqual(['press', 'technical']);
    expect(hasReviewedExternalReferences(proposal.references)).toBe(false);
    expect(hasCompleteReviewedReferenceSet(proposal.references)).toBe(false);
  });

  it('attaches editorial references in batch via attachEditorialReferencesToProposals', () => {
    const proposals = attachEditorialReferencesToProposals([
      createProposal(),
      createProposal({
        id: 'camara-proposicao-220',
        title: 'PL 220/2025',
        type: 'PL',
        number: '220',
        year: 2025
      })
    ]);

    expect(proposals[0].references.length).toBe(3);
    expect(proposals[1].references.length).toBe(1);
    expect(proposals[1].references[0].id).toBe('bill-pl-220-2025-official-camara');
  });
});
