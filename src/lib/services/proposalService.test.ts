import { describe, expect, it } from 'vitest';
import {
  getProposalById,
  getProposalByIdForParliamentarian,
  getProposalsByParliamentarianId
} from './proposalService';

describe('getProposalsByParliamentarianId', () => {
  it('returns controlled proposals associated with a parliamentarian', () => {
    const proposals = getProposalsByParliamentarianId('parliamentarian-ana-costa');

    expect(proposals.map((proposal) => proposal.title)).toEqual(['PL 220/2025', 'PL 1234/2024']);
    expect(proposals[0]).toMatchObject({
      id: 'bill-pl-220-2025',
      source: 'camara',
      type: 'PL',
      number: '220',
      year: 2025
    });
  });

  it('returns an empty list for a parliamentarian without controlled proposals', () => {
    expect(getProposalsByParliamentarianId('parliamentarian-sem-proposicoes')).toEqual([]);
  });
});

describe('getProposalById', () => {
  it('returns a complete proposal detail as a domain contract', () => {
    const proposal = getProposalById('bill-pl-1234-2024');

    expect(proposal).toMatchObject({
      title: 'PL 1234/2024',
      source: 'camara',
      subject: 'Educação',
      presentedAt: '2024-03-15',
      simplifiedSummary:
        'A proposicao trata da publicacao de informacoes educacionais por instituicoes publicas de ensino.',
      officialUrl: 'https://www.camara.leg.br/propostas-legislativas/1234'
    });
    expect(proposal?.references.map((reference) => reference.type)).toEqual([
      'official',
      'press',
      'technical'
    ]);
    expect(proposal?.references.every((reference) => reference.checkedAt)).toBe(true);
  });

  it('keeps partial proposal data explicit', () => {
    const proposal = getProposalById('bill-pl-220-2025');

    expect(proposal).toMatchObject({
      title: 'PL 220/2025',
      subject: 'Direitos do consumidor'
    });
    expect(proposal?.presentedAt).toBeUndefined();
    expect(proposal?.simplifiedSummary).toBeUndefined();
    expect(proposal?.references.map((reference) => reference.type)).toEqual(['official']);
    expect(proposal?.references[0].checkedAt).toBe('2026-06-29');
  });

  it('returns null for an unknown proposal id', () => {
    expect(getProposalById('bill-nao-existente')).toBeNull();
  });
});

describe('getProposalByIdForParliamentarian', () => {
  it('returns a proposal when it belongs to the parliamentarian', () => {
    const proposal = getProposalByIdForParliamentarian(
      'bill-pl-1234-2024',
      'parliamentarian-ana-costa'
    );

    expect(proposal?.title).toBe('PL 1234/2024');
  });

  it('returns null when the proposal belongs to another parliamentarian', () => {
    expect(
      getProposalByIdForParliamentarian('bill-pec-45-2023', 'parliamentarian-ana-costa')
    ).toBeNull();
  });
});
