import { describe, expect, it } from 'vitest';
import { VOTE_POSITIONS } from '$lib/domain';
import {
  getVoteById,
  getVoteByIdForParliamentarian,
  getVotesByParliamentarianId
} from './voteService';

describe('getVotesByParliamentarianId', () => {
  it('returns controlled votes associated with a parliamentarian', () => {
    const votes = getVotesByParliamentarianId('parliamentarian-ana-costa');

    expect(votes.map((vote) => vote.proposalId)).toEqual(['PL 1234/2024', 'PL 220/2025']);
    expect(votes[0]).toMatchObject({
      id: 'vote-pl-1234-2024-texto-base',
      source: 'camara',
      votedAt: '2024-06-12',
      result: 'Aprovado'
    });
  });

  it('returns an empty list for a parliamentarian without controlled votes', () => {
    expect(getVotesByParliamentarianId('parliamentarian-sem-votacoes')).toEqual([]);
  });
});

describe('getVoteById', () => {
  it('returns a complete vote detail as a domain contract', () => {
    const vote = getVoteById('vote-pl-1234-2024-texto-base');

    expect(vote).toMatchObject({
      proposalId: 'PL 1234/2024',
      source: 'camara',
      votedAt: '2024-06-12',
      result: 'Aprovado',
      counts: {
        yes: 312,
        no: 112,
        abstention: 8,
        absent: 81
      }
    });
    expect(vote?.individualVotes.map((individualVote) => individualVote.vote)).toEqual([
      'SIM',
      'NAO',
      'ABSTENCAO',
      'AUSENTE'
    ]);
  });

  it('keeps partial vote data explicit', () => {
    const vote = getVoteById('vote-pl-220-2025-comissao');

    expect(vote).toMatchObject({
      proposalId: 'PL 220/2025',
      source: 'camara'
    });
    expect(vote?.votedAt).toBeUndefined();
    expect(vote?.result).toBeUndefined();
    expect(vote?.counts).toBeUndefined();
    expect(vote?.individualVotes).toEqual([]);
  });

  it('uses only accepted neutral domain vote labels', () => {
    const acceptedLabels = new Set(VOTE_POSITIONS);
    const votes = [
      ...getVotesByParliamentarianId('parliamentarian-ana-costa'),
      ...getVotesByParliamentarianId('parliamentarian-bruno-ribeiro')
    ];

    for (const vote of votes) {
      for (const individualVote of vote.individualVotes) {
        expect(acceptedLabels.has(individualVote.vote)).toBe(true);
      }
    }
  });

  it('returns null for an unknown vote id', () => {
    expect(getVoteById('vote-nao-existente')).toBeNull();
  });
});

describe('getVoteByIdForParliamentarian', () => {
  it('returns a vote when it belongs to the parliamentarian', () => {
    const vote = getVoteByIdForParliamentarian(
      'vote-pl-1234-2024-texto-base',
      'parliamentarian-ana-costa'
    );

    expect(vote?.proposalId).toBe('PL 1234/2024');
  });

  it('returns null when the vote belongs to another parliamentarian', () => {
    expect(
      getVoteByIdForParliamentarian(
        'vote-pec-45-2023-turno-unico',
        'parliamentarian-ana-costa'
      )
    ).toBeNull();
  });
});
