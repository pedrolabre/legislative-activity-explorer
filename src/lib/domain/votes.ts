export const VOTE_POSITIONS = ['SIM', 'NAO', 'ABSTENCAO', 'AUSENTE'] as const;

export type VotePosition = (typeof VOTE_POSITIONS)[number];

export const DISPLAY_VOTE_POSITIONS = ['SIM', 'NÃO', 'ABSTENÇÃO', 'AUSENTE'] as const;

export type DisplayVotePosition = (typeof DISPLAY_VOTE_POSITIONS)[number];

export interface VoteCounts {
  yes: number;
  no: number;
  abstention: number;
  absent: number;
}

export function toDisplayVotePosition(vote: VotePosition): DisplayVotePosition {
  if (vote === 'NAO') {
    return 'NÃO';
  }

  if (vote === 'ABSTENCAO') {
    return 'ABSTENÇÃO';
  }

  return vote;
}
