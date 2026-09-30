import { describe, expect, it } from 'vitest';
import type { LegislativeProposal } from '$lib/domain';
import {
  attachReviewedFactualSummaryToProposal,
  attachReviewedFactualSummaryToProposals,
  getReviewedFactualSummaryForProposal
} from './factualSummaryService';

function createProposal(overrides: Partial<LegislativeProposal> = {}): LegislativeProposal {
  const isDefault = !overrides.id || overrides.id === 'bill-pl-1234-2024';

  return {
    id: 'bill-pl-1234-2024',
    origin: 'official',
    source: 'camara',
    sourceId: isDefault ? '1234' : '9999',
    title: isDefault ? 'PL 1234/2024' : 'Proposição',
    type: isDefault ? 'PL' : 'OUTRO',
    number: isDefault ? '1234' : '9999',
    year: isDefault ? 2024 : 2099,
    officialSummary: 'Ementa oficial controlada.',
    references: [],
    ...overrides
  };
}

describe('factualSummaryService', () => {
  it('attaches a reviewed factual summary from the versioned catalog', () => {
    const proposal = createProposal();
    const enrichedProposal = attachReviewedFactualSummaryToProposal(proposal);

    expect(enrichedProposal).not.toBe(proposal);
    expect(enrichedProposal.simplifiedSummary).toBe(
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.'
    );
    expect(proposal.simplifiedSummary).toBeUndefined();
  });

  it('uses the selected catalog id when official detail returns a different domain id', () => {
    const proposal = createProposal({
      id: 'camara-proposicao-1234',
      sourceId: '1234',
      title: 'PL 1234/2024',
      type: 'PL',
      number: '1234',
      year: 2024
    });

    expect(getReviewedFactualSummaryForProposal(proposal, 'bill-pl-1234-2024')).toBe(
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.'
    );
  });

  it('attaches reviewed factual summary automatically to official Camara proposals without catalog id override', () => {
    const proposal = createProposal({
      id: 'camara-proposicao-1234',
      sourceId: '1234',
      title: 'PL 1234/2024',
      type: 'PL',
      number: '1234',
      year: 2024
    });

    const enrichedProposal = attachReviewedFactualSummaryToProposal(proposal);

    expect(enrichedProposal.simplifiedSummary).toBe(
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.'
    );
  });

  it('attaches reviewed factual summary automatically to official Senado proposals without catalog id override', () => {
    const proposal = createProposal({
      id: 'senado-materia-45',
      source: 'senado',
      sourceId: '45',
      title: 'PEC 45/2023',
      type: 'PEC',
      number: '45',
      year: 2023
    });

    const enrichedProposal = attachReviewedFactualSummaryToProposal(proposal);

    expect(enrichedProposal.simplifiedSummary).toBe(
      'A proposição trata de dispositivos constitucionais relacionados ao financiamento de ações públicas de saúde.'
    );
  });

  it('resolves reviewed summary when proposal has an arbitrary domain id but matching structured type/number/year', () => {
    const proposal = createProposal({
      id: 'camara-proposicao-custom-998877',
      sourceId: '998877',
      title: 'PL 1234/2024',
      type: 'PL',
      number: '1234',
      year: 2024
    });

    const enrichedProposal = attachReviewedFactualSummaryToProposal(proposal);

    expect(enrichedProposal.simplifiedSummary).toBe(
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.'
    );
  });

  it('does not keep an uncataloged simplified summary as reviewed content', () => {
    const proposal = createProposal({
      id: 'proposal-without-reviewed-summary',
      simplifiedSummary: 'Resumo anterior sem revisao catalogada.'
    });
    const enrichedProposal = attachReviewedFactualSummaryToProposal(proposal);

    expect(enrichedProposal.simplifiedSummary).toBeUndefined();
    expect(enrichedProposal.officialSummary).toBe('Ementa oficial controlada.');
  });

  it('does not derive a reviewed factual summary from the official summary', () => {
    const proposal = createProposal({
      id: 'proposal-with-official-summary-only',
      officialSummary: 'Ementa oficial nao catalogada como resumo revisado.'
    });
    const enrichedProposal = attachReviewedFactualSummaryToProposal(proposal);

    expect(enrichedProposal.simplifiedSummary).toBeUndefined();
    expect(enrichedProposal.officialSummary).toBe(
      'Ementa oficial nao catalogada como resumo revisado.'
    );
  });

  it('attaches reviewed factual summaries to proposal lists deterministically', () => {
    const proposals = attachReviewedFactualSummaryToProposals([
      createProposal(),
      createProposal({
        id: 'bill-pl-220-2025',
        title: 'PL 220/2025',
        type: 'PL',
        number: '220',
        year: 2025,
        officialSummary: 'Altera normas sobre contratos de prestacao continuada.'
      })
    ]);

    expect(proposals.map((proposal) => proposal.simplifiedSummary)).toEqual([
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.',
      undefined
    ]);
  });
});
