import { describe, expect, it } from 'vitest';
import {
  getChamberLabel,
  normalizeName,
  toSearchParliamentarianResult,
  toSearchProposalResult,
  isIndividualVoteForParliamentarian
} from './pageViewModelMappers';
import type { LegislativeProposal, Parliamentarian } from '$lib/domain';

describe('pageViewModelMappers', () => {
  it('correctly maps chamber labels', () => {
    expect(getChamberLabel('camara')).toBe('Câmara dos Deputados');
    expect(getChamberLabel('senado')).toBe('Senado Federal');
  });

  it('normalizes names removing accents and lowercase', () => {
    expect(normalizeName('Érika Hílton')).toBe('erika hilton');
    expect(normalizeName('João da Silva')).toBe('joao da silva');
  });

  it('maps search parliamentarian and proposal view models', () => {
    const parliamentarian: Parliamentarian = {
      id: 'camara-10',
      source: 'camara',
      sourceId: '10',
      origin: 'official',
      name: 'Nome Teste',
      office: 'Deputado Federal',
      party: 'PARTIDO',
      state: 'SP',
      status: 'Exercício',
      term: '57'
    };

    const result = toSearchParliamentarianResult(parliamentarian);
    expect(result.kind).toBe('parliamentarian');
    expect(result.chamber).toBe('Câmara dos Deputados');
    expect(result.name).toBe('Nome Teste');

    const proposal: LegislativeProposal = {
      id: 'camara-proposicao-100',
      source: 'camara',
      sourceId: '100',
      origin: 'official',
      title: 'PL 100/2024',
      type: 'PL',
      number: '100',
      year: 2024,
      subject: 'Educação',
      status: 'Em tramitação',
      references: []
    };

    const propResult = toSearchProposalResult(proposal);
    expect(propResult.kind).toBe('proposal');
    expect(propResult.chamber).toBe('Câmara dos Deputados');
    expect(propResult.subjectLabel).toBe('Tema');
  });

  it('identifies individual votes for parliamentarians by id or normalized name', () => {
    const parliamentarian: Parliamentarian = {
      id: 'camara-10',
      source: 'camara',
      sourceId: '10',
      origin: 'official',
      name: 'Maria Silva',
      office: 'Deputada Federal',
      party: 'PARTIDO',
      state: 'RJ',
      status: 'Exercício'
    };

    const vote1 = {
      parliamentarianId: 'camara-10',
      parliamentarianName: 'Maria Silva',
      vote: 'SIM' as const
    };

    const vote2 = {
      parliamentarianName: 'Mária Sílva',
      vote: 'NAO' as const
    };

    const vote3 = {
      parliamentarianName: 'Outro Nome',
      vote: 'SIM' as const
    };

    expect(isIndividualVoteForParliamentarian(vote1, parliamentarian)).toBe(true);
    expect(isIndividualVoteForParliamentarian(vote2, parliamentarian)).toBe(true);
    expect(isIndividualVoteForParliamentarian(vote3, parliamentarian)).toBe(false);
  });
});
