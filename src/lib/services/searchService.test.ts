import { describe, expect, it } from 'vitest';
import { emptySearchResults, searchInitialRecords } from './searchService';

describe('searchInitialRecords', () => {
  it('returns parliamentarian results as domain contracts', () => {
    const results = searchInitialRecords('ana');

    expect(results.parliamentarians).toHaveLength(1);
    expect(results.parliamentarians[0]).toMatchObject({
      id: 'parliamentarian-ana-costa',
      source: 'camara',
      name: 'Ana Costa',
      office: 'Deputada federal',
      party: 'Partido A',
      state: 'MG'
    });
    expect(results.proposals).toEqual([]);
  });

  it('returns proposal results as domain contracts', () => {
    const results = searchInitialRecords('PL 1234');

    expect(results.proposals).toHaveLength(1);
    expect(results.proposals[0]).toMatchObject({
      id: 'proposal-pl-1234-2024',
      source: 'camara',
      title: 'PL 1234/2024',
      type: 'PL',
      number: '1234',
      year: 2024
    });
    expect(results.proposals[0].references).toEqual([]);
  });

  it('returns separated groups for a shared subject', () => {
    const results = searchInitialRecords('educacao');

    expect(results.parliamentarians.map((parliamentarian) => parliamentarian.name)).toEqual([
      'Ana Costa'
    ]);
    expect(results.proposals.map((proposal) => proposal.title)).toEqual(['PL 1234/2024']);
  });

  it('keeps an exported empty result contract', () => {
    expect(emptySearchResults).toEqual({
      parliamentarians: [],
      proposals: []
    });
  });
});
