import { describe, expect, it } from 'vitest';
import {
  getVoteById,
  getVotesByParliamentarianId,
  votePositions
} from './parliamentarianVoteFixtures';

describe('getVotesByParliamentarianId', () => {
  it('returns controlled votes associated with a parliamentarian', () => {
    const votes = getVotesByParliamentarianId('parliamentarian-ana-costa');

    expect(votes.map((vote) => vote.billIdentification)).toEqual([
      'PL 1234/2024',
      'PL 220/2025'
    ]);
  });

  it('returns an empty list for a parliamentarian without controlled votes', () => {
    expect(getVotesByParliamentarianId('parliamentarian-sem-votacoes')).toEqual([]);
  });
});

describe('getVoteById', () => {
  it('returns a complete vote detail when available', () => {
    const vote = getVoteById('vote-pl-1234-2024-texto-base');

    expect(vote).toMatchObject({
      billIdentification: 'PL 1234/2024',
      chamber: 'Câmara dos Deputados',
      votedAt: '2024-06-12',
      officialResult: 'Aprovado',
      parliamentarianVote: 'SIM',
      counts: {
        yes: 312,
        no: 112,
        abstention: 8,
        absent: 81
      }
    });
    expect(vote?.individualVotes.map((individualVote) => individualVote.vote)).toEqual([
      'SIM',
      'NÃO',
      'ABSTENÇÃO',
      'AUSENTE'
    ]);
  });

  it('keeps partial vote data explicit', () => {
    const vote = getVoteById('vote-pl-220-2025-comissao');

    expect(vote).toMatchObject({
      billIdentification: 'PL 220/2025',
      chamber: 'Câmara dos Deputados',
      parliamentarianVote: 'AUSENTE'
    });
    expect(vote?.votedAt).toBeUndefined();
    expect(vote?.officialResult).toBeUndefined();
    expect(vote?.counts).toBeUndefined();
    expect(vote?.individualVotes).toEqual([]);
  });

  it('uses only the accepted neutral vote labels', () => {
    const acceptedLabels = new Set(votePositions);
    const votes = [
      ...getVotesByParliamentarianId('parliamentarian-ana-costa'),
      ...getVotesByParliamentarianId('parliamentarian-bruno-ribeiro')
    ];

    for (const vote of votes) {
      expect(acceptedLabels.has(vote.parliamentarianVote)).toBe(true);

      for (const individualVote of vote.individualVotes) {
        expect(acceptedLabels.has(individualVote.vote)).toBe(true);
      }
    }
  });

  it('returns undefined for an unknown vote id', () => {
    expect(getVoteById('vote-nao-existente')).toBeUndefined();
  });
});
