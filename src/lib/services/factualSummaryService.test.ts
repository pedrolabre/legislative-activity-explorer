import { describe, expect, it } from 'vitest';
import type { LegislativeProposal } from '$lib/domain';
import {
  attachReviewedFactualSummaryToProposal,
  attachReviewedFactualSummaryToProposals,
  getReviewedFactualSummaryForProposal
} from './factualSummaryService';

function createProposal(overrides: Partial<LegislativeProposal> = {}): LegislativeProposal {
  return {
    id: 'bill-pl-1234-2024',
    source: 'camara',
    sourceId: 'bill-pl-1234-2024',
    title: 'PL 1234/2024',
    type: 'PL',
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
      sourceId: '1234'
    });

    expect(getReviewedFactualSummaryForProposal(proposal, 'bill-pl-1234-2024')).toBe(
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

  it('attaches reviewed factual summaries to proposal lists deterministically', () => {
    const proposals = attachReviewedFactualSummaryToProposals([
      createProposal(),
      createProposal({
        id: 'bill-pl-220-2025',
        title: 'PL 220/2025',
        officialSummary: 'Altera normas sobre contratos de prestacao continuada.'
      })
    ]);

    expect(proposals.map((proposal) => proposal.simplifiedSummary)).toEqual([
      'A proposição trata da publicação de informações educacionais por instituições públicas de ensino.',
      undefined
    ]);
  });
});
