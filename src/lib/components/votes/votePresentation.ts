import type { DisplayVotePosition, ParliamentarianVoteIndividualView } from '$lib/domain';
export { DISPLAY_VOTE_POSITIONS, type DisplayVotePosition } from '$lib/domain';

export const votePresentationClassByPosition: Record<DisplayVotePosition, string> = {
  SIM: 'border-[#2f5d7c] bg-[#e9f1f6] text-[#203f55]',
  NÃO: 'border-[#6b5b7a] bg-[#f1eef5] text-[#493f56]',
  ABSTENÇÃO: 'border-[#8a6f2a] bg-[#fbf3d5] text-[#5d4b1c]',
  AUSENTE: 'border-border bg-surface-muted text-ink-muted'
};

export function getVotePresentationClass(vote: DisplayVotePosition) {
  return votePresentationClassByPosition[vote];
}

export const DEFAULT_NOMINAL_PAGE_SIZE = 25;
export const NOMINAL_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type NominalVoteFilter = 'TODOS' | DisplayVotePosition;

export interface FilterNominalVotesOptions {
  query?: string;
  votePosition?: NominalVoteFilter;
}

export interface PaginatedIndividualVotes {
  items: ParliamentarianVoteIndividualView[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  startItemIndex: number;
  endItemIndex: number;
}

export function normalizeSearchText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function filterIndividualVotes(
  votes: ParliamentarianVoteIndividualView[],
  options?: FilterNominalVotesOptions
): ParliamentarianVoteIndividualView[] {
  if (!options) {
    return votes;
  }

  const normalizedQuery = options.query ? normalizeSearchText(options.query) : '';
  const votePosition = options.votePosition ?? 'TODOS';

  if (!normalizedQuery && votePosition === 'TODOS') {
    return votes;
  }

  return votes.filter((item) => {
    if (votePosition !== 'TODOS' && item.vote !== votePosition) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const nameMatch = normalizeSearchText(item.parliamentarianName).includes(normalizedQuery);
    const partyMatch = normalizeSearchText(item.party).includes(normalizedQuery);
    const stateMatch = normalizeSearchText(item.state).includes(normalizedQuery);

    return nameMatch || partyMatch || stateMatch;
  });
}

export function prioritizeSelectedParliamentarian(
  votes: ParliamentarianVoteIndividualView[]
): ParliamentarianVoteIndividualView[] {
  const selectedIndex = votes.findIndex((item) => item.isSelectedParliamentarian);
  if (selectedIndex <= 0) {
    return votes;
  }

  const selectedItem = votes[selectedIndex];
  const otherItems = votes.filter((_, idx) => idx !== selectedIndex);
  return [selectedItem, ...otherItems];
}

export function paginateIndividualVotes(
  votes: ParliamentarianVoteIndividualView[],
  page: number,
  pageSize: number = DEFAULT_NOMINAL_PAGE_SIZE
): PaginatedIndividualVotes {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const totalItems = votes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page)), totalPages);

  if (totalItems === 0) {
    return {
      items: [],
      totalPages: 1,
      totalItems: 0,
      currentPage: 1,
      pageSize: safePageSize,
      startItemIndex: 0,
      endItemIndex: 0
    };
  }

  const startIndex = (currentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, totalItems);
  const items = votes.slice(startIndex, endIndex);

  return {
    items,
    totalPages,
    totalItems,
    currentPage,
    pageSize: safePageSize,
    startItemIndex: startIndex + 1,
    endItemIndex: endIndex
  };
}

export function countVotesByPosition(
  votes: ParliamentarianVoteIndividualView[]
): Record<DisplayVotePosition, number> {
  const counts: Record<DisplayVotePosition, number> = {
    SIM: 0,
    NÃO: 0,
    ABSTENÇÃO: 0,
    AUSENTE: 0
  };

  for (const item of votes) {
    if (item.vote in counts) {
      counts[item.vote]++;
    }
  }

  return counts;
}
