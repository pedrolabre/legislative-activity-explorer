import { describe, expect, it } from 'vitest';
import type { ParliamentarianVoteIndividualView } from '$lib/domain';
import {
  DEFAULT_NOMINAL_PAGE_SIZE,
  DISPLAY_VOTE_POSITIONS,
  NOMINAL_PAGE_SIZE_OPTIONS,
  countVotesByPosition,
  filterIndividualVotes,
  getVotePresentationClass,
  normalizeSearchText,
  paginateIndividualVotes,
  prioritizeSelectedParliamentarian,
  votePresentationClassByPosition
} from './votePresentation';

const forbiddenValueColorTokens = [
  'green',
  'red',
  'emerald',
  'lime',
  'rose',
  'verde',
  'vermelho',
  'vermelha'
];

const mockVotes: ParliamentarianVoteIndividualView[] = [
  {
    parliamentarianName: 'Carlos Silva',
    party: 'PT',
    state: 'SP',
    vote: 'SIM',
    isSelectedParliamentarian: false
  },
  {
    parliamentarianName: 'Érika Hilton',
    party: 'PSOL',
    state: 'SP',
    vote: 'SIM',
    isSelectedParliamentarian: true
  },
  {
    parliamentarianName: 'Rodrigo Maia',
    party: 'DEM',
    state: 'RJ',
    vote: 'NÃO',
    isSelectedParliamentarian: false
  },
  {
    parliamentarianName: 'Tabata Amaral',
    party: 'PSB',
    state: 'SP',
    vote: 'ABSTENÇÃO',
    isSelectedParliamentarian: false
  },
  {
    parliamentarianName: 'Zeca Dirceu',
    party: 'PT',
    state: 'PR',
    vote: 'AUSENTE',
    isSelectedParliamentarian: false
  }
];

describe('votePresentation', () => {
  it('keeps the visible vote labels restricted to official positions', () => {
    expect(DISPLAY_VOTE_POSITIONS).toEqual(['SIM', 'NÃO', 'ABSTENÇÃO', 'AUSENTE']);
  });

  it('keeps audited neutral color classes for each vote position', () => {
    expect(votePresentationClassByPosition).toEqual({
      SIM: 'border-[#2f5d7c] bg-[#e9f1f6] text-[#203f55]',
      NÃO: 'border-[#6b5b7a] bg-[#f1eef5] text-[#493f56]',
      ABSTENÇÃO: 'border-[#8a6f2a] bg-[#fbf3d5] text-[#5d4b1c]',
      AUSENTE: 'border-border bg-surface-muted text-ink-muted'
    });
  });

  it('does not use green or red vote color tokens', () => {
    for (const vote of DISPLAY_VOTE_POSITIONS) {
      const className = getVotePresentationClass(vote).toLocaleLowerCase('pt-BR');

      for (const token of forbiddenValueColorTokens) {
        expect(className).not.toContain(token);
      }
    }
  });

  it('exports page size defaults and options', () => {
    expect(DEFAULT_NOMINAL_PAGE_SIZE).toBe(25);
    expect(NOMINAL_PAGE_SIZE_OPTIONS).toEqual([25, 50, 100]);
  });

  describe('normalizeSearchText', () => {
    it('normalizes accents, casing and white space', () => {
      expect(normalizeSearchText('  Érika Hilton  ')).toBe('erika hilton');
      expect(normalizeSearchText('São Paulo')).toBe('sao paulo');
      expect(normalizeSearchText('ABSTENÇÃO')).toBe('abstencao');
    });
  });

  describe('filterIndividualVotes', () => {
    it('returns all votes when options is empty or undefined', () => {
      expect(filterIndividualVotes(mockVotes)).toEqual(mockVotes);
      expect(filterIndividualVotes(mockVotes, {})).toEqual(mockVotes);
      expect(filterIndividualVotes(mockVotes, { votePosition: 'TODOS' })).toEqual(mockVotes);
    });

    it('filters votes by parliamentarian name ignoring case and diacritics', () => {
      const results = filterIndividualVotes(mockVotes, { query: 'erika' });
      expect(results).toHaveLength(1);
      expect(results[0].parliamentarianName).toBe('Érika Hilton');
    });

    it('filters votes by party acronym', () => {
      const results = filterIndividualVotes(mockVotes, { query: 'pt' });
      expect(results).toHaveLength(2);
      expect(results.map((v) => v.parliamentarianName)).toEqual(['Carlos Silva', 'Zeca Dirceu']);
    });

    it('filters votes by state (UF)', () => {
      const results = filterIndividualVotes(mockVotes, { query: 'rj' });
      expect(results).toHaveLength(1);
      expect(results[0].parliamentarianName).toBe('Rodrigo Maia');
    });

    it('filters votes by vote position', () => {
      const simVotes = filterIndividualVotes(mockVotes, { votePosition: 'SIM' });
      expect(simVotes).toHaveLength(2);

      const naoVotes = filterIndividualVotes(mockVotes, { votePosition: 'NÃO' });
      expect(naoVotes).toHaveLength(1);
      expect(naoVotes[0].parliamentarianName).toBe('Rodrigo Maia');

      const abstencaoVotes = filterIndividualVotes(mockVotes, { votePosition: 'ABSTENÇÃO' });
      expect(abstencaoVotes).toHaveLength(1);
      expect(abstencaoVotes[0].parliamentarianName).toBe('Tabata Amaral');

      const ausenteVotes = filterIndividualVotes(mockVotes, { votePosition: 'AUSENTE' });
      expect(ausenteVotes).toHaveLength(1);
      expect(ausenteVotes[0].parliamentarianName).toBe('Zeca Dirceu');
    });

    it('combines text query and vote position filters', () => {
      const results = filterIndividualVotes(mockVotes, {
        query: 'sp',
        votePosition: 'SIM'
      });
      expect(results).toHaveLength(2);
      expect(results.map((v) => v.parliamentarianName)).toEqual(['Carlos Silva', 'Érika Hilton']);

      const nonMatching = filterIndividualVotes(mockVotes, {
        query: 'rj',
        votePosition: 'SIM'
      });
      expect(nonMatching).toHaveLength(0);
    });
  });

  describe('prioritizeSelectedParliamentarian', () => {
    it('moves selected parliamentarian to index 0 maintaining relative order of others', () => {
      const prioritized = prioritizeSelectedParliamentarian(mockVotes);
      expect(prioritized[0].parliamentarianName).toBe('Érika Hilton');
      expect(prioritized[0].isSelectedParliamentarian).toBe(true);
      expect(prioritized.slice(1).map((v) => v.parliamentarianName)).toEqual([
        'Carlos Silva',
        'Rodrigo Maia',
        'Tabata Amaral',
        'Zeca Dirceu'
      ]);
    });

    it('returns unmodified array when selected parliamentarian is already at index 0', () => {
      const alreadyFirst: ParliamentarianVoteIndividualView[] = [
        mockVotes[1],
        mockVotes[0]
      ];
      expect(prioritizeSelectedParliamentarian(alreadyFirst)).toEqual(alreadyFirst);
    });

    it('returns unmodified array when no parliamentarian is selected', () => {
      const noSelected: ParliamentarianVoteIndividualView[] = [
        mockVotes[0],
        mockVotes[2]
      ];
      expect(prioritizeSelectedParliamentarian(noSelected)).toEqual(noSelected);
    });
  });

  describe('paginateIndividualVotes', () => {
    it('handles empty votes list gracefully', () => {
      const result = paginateIndividualVotes([], 1, 25);
      expect(result).toEqual({
        items: [],
        totalPages: 1,
        totalItems: 0,
        currentPage: 1,
        pageSize: 25,
        startItemIndex: 0,
        endItemIndex: 0
      });
    });

    it('slices items correctly for first page', () => {
      const result = paginateIndividualVotes(mockVotes, 1, 2);
      expect(result.items).toHaveLength(2);
      expect(result.items.map((v) => v.parliamentarianName)).toEqual([
        'Carlos Silva',
        'Érika Hilton'
      ]);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(3);
      expect(result.totalItems).toBe(5);
      expect(result.startItemIndex).toBe(1);
      expect(result.endItemIndex).toBe(2);
    });

    it('slices items correctly for middle and last pages', () => {
      const page2 = paginateIndividualVotes(mockVotes, 2, 2);
      expect(page2.items.map((v) => v.parliamentarianName)).toEqual([
        'Rodrigo Maia',
        'Tabata Amaral'
      ]);
      expect(page2.startItemIndex).toBe(3);
      expect(page2.endItemIndex).toBe(4);

      const page3 = paginateIndividualVotes(mockVotes, 3, 2);
      expect(page3.items.map((v) => v.parliamentarianName)).toEqual(['Zeca Dirceu']);
      expect(page3.startItemIndex).toBe(5);
      expect(page3.endItemIndex).toBe(5);
    });

    it('clamps requested page within valid boundary [1, totalPages]', () => {
      const underflow = paginateIndividualVotes(mockVotes, 0, 2);
      expect(underflow.currentPage).toBe(1);

      const overflow = paginateIndividualVotes(mockVotes, 10, 2);
      expect(overflow.currentPage).toBe(3);
    });
  });

  describe('countVotesByPosition', () => {
    it('aggregates counts for all four official positions correctly', () => {
      const counts = countVotesByPosition(mockVotes);
      expect(counts).toEqual({
        SIM: 2,
        NÃO: 1,
        ABSTENÇÃO: 1,
        AUSENTE: 1
      });
    });

    it('returns all zeros for empty list', () => {
      expect(countVotesByPosition([])).toEqual({
        SIM: 0,
        NÃO: 0,
        ABSTENÇÃO: 0,
        AUSENTE: 0
      });
    });
  });
});
