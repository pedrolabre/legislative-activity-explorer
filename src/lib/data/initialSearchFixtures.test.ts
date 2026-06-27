import { describe, expect, it } from 'vitest';
import { findInitialSearchResults } from './initialSearchFixtures';

describe('findInitialSearchResults', () => {
  it('returns a parliamentarian result for a known name', () => {
    const results = findInitialSearchResults('ana');

    expect(results.parliamentarians).toHaveLength(1);
    expect(results.parliamentarians[0].name).toBe('Ana Costa');
    expect(results.proposals).toHaveLength(0);
  });

  it('returns a proposal result for a known identifier', () => {
    const results = findInitialSearchResults('PL 1234');

    expect(results.parliamentarians).toHaveLength(0);
    expect(results.proposals).toHaveLength(1);
    expect(results.proposals[0].title).toBe('PL 1234/2024');
  });

  it('returns separated result groups for a shared subject', () => {
    const results = findInitialSearchResults('educacao');

    expect(results.parliamentarians.map((result) => result.name)).toEqual(['Ana Costa']);
    expect(results.proposals.map((result) => result.title)).toEqual(['PL 1234/2024']);
  });

  it('returns an empty result set for an unknown term', () => {
    const results = findInitialSearchResults('termo sem correspondencia');

    expect(results.parliamentarians).toHaveLength(0);
    expect(results.proposals).toHaveLength(0);
  });
});
