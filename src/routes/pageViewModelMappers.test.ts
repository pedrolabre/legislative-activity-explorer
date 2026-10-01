import { describe, expect, it } from 'vitest';
import {
  getChamberLabel,
  getParliamentarianBillsFeedback,
  getParliamentarianVotesFeedback,
  getProposalVotesFeedback,
  isIndividualVoteForParliamentarian,
  normalizeName,
  toParliamentarianBillView,
  toParliamentarianDetailView,
  toParliamentarianVoteView,
  toProposalVoteView,
  toSearchParliamentarianResult,
  toSearchProposalResult
} from './pageViewModelMappers';
import type { LegislativeProposal, Parliamentarian, RollCallVote } from '$lib/domain';
import {
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianSessionVotesEmptyMessage,
  officialParliamentarianStaticCoverageDescription,
  officialSenadoAssociatedMattersEmptyMessage,
  officialSenadoAssociatedMattersUnavailableDescription,
  officialSenadoProposalVotesEmptyMessage
} from '$lib/ui/officialMessages';

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

  it('computes parliamentarian bills feedback correctly', () => {
    const senadoParl: Parliamentarian = {
      id: 'senado-50',
      source: 'senado',
      sourceId: '50',
      origin: 'official',
      name: 'Senador Teste',
      office: 'Senador',
      party: 'PARTIDO',
      state: 'SP',
      status: 'Exercício'
    };

    const camaraParl: Parliamentarian = {
      id: 'camara-20',
      source: 'camara',
      sourceId: '20',
      origin: 'official',
      name: 'Deputado Teste',
      office: 'Deputado Federal',
      party: 'PARTIDO',
      state: 'RJ',
      status: 'Exercício'
    };

    const senadoFeedback = getParliamentarianBillsFeedback(senadoParl);
    expect(senadoFeedback.emptyTitle).toBe(officialSenadoAssociatedMattersEmptyMessage);
    expect(senadoFeedback.emptyDescription).toBe(
      officialSenadoAssociatedMattersUnavailableDescription
    );

    const camaraFeedback = getParliamentarianBillsFeedback(camaraParl);
    expect(camaraFeedback.emptyTitle).toBeUndefined();
    expect(camaraFeedback.emptyDescription).toBeUndefined();

    const nullFeedback = getParliamentarianBillsFeedback(null);
    expect(nullFeedback.emptyTitle).toBeUndefined();
    expect(nullFeedback.emptyDescription).toBeUndefined();
  });

  it('computes parliamentarian votes feedback correctly', () => {
    const officialParl: Parliamentarian = {
      id: 'camara-30',
      source: 'camara',
      sourceId: '30',
      origin: 'official',
      name: 'Deputado Teste',
      office: 'Deputado Federal',
      party: 'PARTIDO',
      state: 'MG',
      status: 'Exercício'
    };

    const withVotesFeedback = getParliamentarianVotesFeedback(officialParl, true);
    expect(withVotesFeedback.coverageDescription).toBe(
      officialParliamentarianSessionVotesCoverageMessage
    );
    expect(withVotesFeedback.emptyTitle).toBe(
      officialParliamentarianSessionVotesEmptyMessage
    );
    expect(withVotesFeedback.emptyDescription).toBe(
      officialParliamentarianStaticCoverageDescription
    );

    const withoutVotesFeedback = getParliamentarianVotesFeedback(officialParl, false);
    expect(withoutVotesFeedback.coverageDescription).toBeUndefined();
    expect(withoutVotesFeedback.emptyTitle).toBe(
      officialParliamentarianSessionVotesEmptyMessage
    );

    const nullFeedback = getParliamentarianVotesFeedback(null, true);
    expect(nullFeedback.coverageDescription).toBeUndefined();
    expect(nullFeedback.emptyTitle).toBeUndefined();
  });

  it('computes proposal votes feedback correctly', () => {
    const camaraProp: LegislativeProposal = {
      id: 'camara-proposicao-400',
      source: 'camara',
      sourceId: '400',
      origin: 'official',
      title: 'PL 400/2024',
      type: 'PL',
      number: '400',
      year: 2024,
      status: 'Em tramitação',
      references: []
    };

    const senadoProp: LegislativeProposal = {
      id: 'senado-materia-500',
      source: 'senado',
      sourceId: '500',
      origin: 'official',
      title: 'PL 500/2024',
      type: 'PL',
      number: '500',
      year: 2024,
      status: 'Em tramitação',
      references: []
    };

    const camaraFeedback = getProposalVotesFeedback(camaraProp);
    expect(camaraFeedback.showOfficialVotes).toBe(true);
    expect(camaraFeedback.officialVotesTitle).toBe('Votações da Câmara');
    expect(camaraFeedback.officialVotesEmptyMessage).toBeUndefined();

    const senadoFeedback = getProposalVotesFeedback(senadoProp);
    expect(senadoFeedback.showOfficialVotes).toBe(true);
    expect(senadoFeedback.officialVotesTitle).toBe('Votações do Senado');
    expect(senadoFeedback.officialVotesEmptyMessage).toBe(
      officialSenadoProposalVotesEmptyMessage
    );

    const nullFeedback = getProposalVotesFeedback(null);
    expect(nullFeedback.showOfficialVotes).toBe(false);
  });

  it('maps parliamentarian detail, bill and vote views', () => {
    const parl: Parliamentarian = {
      id: 'camara-1',
      source: 'camara',
      sourceId: '1',
      origin: 'official',
      name: 'Deputado Teste',
      fullName: 'Nome Completo Deputado',
      office: 'Deputado Federal',
      party: 'PARTIDO',
      state: 'SP',
      status: 'Exercício',
      email: 'deputado@camara.leg.br'
    };

    const detailView = toParliamentarianDetailView(parl);
    expect(detailView.name).toBe('Deputado Teste');
    expect(detailView.chamber).toBe('Câmara dos Deputados');
    expect(detailView.email).toBe('deputado@camara.leg.br');

    const prop: LegislativeProposal = {
      id: 'camara-proposicao-1',
      source: 'camara',
      sourceId: '1',
      origin: 'official',
      title: 'PL 1/2024',
      type: 'PL',
      number: '1',
      year: 2024,
      status: 'Pronta para Pauta',
      references: []
    };

    const billView = toParliamentarianBillView(prop, parl.id);
    expect(billView.identification).toBe('PL 1/2024');
    expect(billView.parliamentarianId).toBe('camara-1');

    const vote: RollCallVote = {
      id: 'vote-1',
      source: 'camara',
      sourceId: '1',
      proposalId: 'PL 1/2024',
      description: 'Votação do mérito',
      votedAt: '2024-05-10',
      result: 'Aprovado',
      counts: { yes: 300, no: 100, abstention: 5, absent: 10 },
      individualVotes: [
        {
          parliamentarianId: 'camara-1',
          parliamentarianName: 'Deputado Teste',
          vote: 'SIM'
        }
      ]
    };

    const voteView = toParliamentarianVoteView(vote, parl);
    expect(voteView.parliamentarianVote).toBe('SIM');
    expect(voteView.individualVotes[0].isSelectedParliamentarian).toBe(true);

    const genericVoteView = toProposalVoteView(vote);
    expect(genericVoteView.parliamentarianId).toBe('');
    expect(genericVoteView.parliamentarianVote).toBeUndefined();
  });
});
