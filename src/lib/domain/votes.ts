export const VOTE_POSITIONS = ['SIM', 'NAO', 'ABSTENCAO', 'AUSENTE'] as const;

export type VotePosition = (typeof VOTE_POSITIONS)[number];

export interface VoteCounts {
  yes: number;
  no: number;
  abstention: number;
  absent: number;
}
