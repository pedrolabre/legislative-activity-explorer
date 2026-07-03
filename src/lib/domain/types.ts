import type { LegislativeSource } from './legislativeSource';
import type { ExternalReferenceType } from './references';
import type { DisplayVotePosition, VoteCounts, VotePosition } from './votes';

export interface Parliamentarian {
  id: string;
  source: LegislativeSource;
  sourceId: string;
  name: string;
  fullName?: string;
  office: string;
  party?: string;
  state?: string;
  status?: string;
  term?: string;
  termLabel?: string;
  photoUrl?: string;
  email?: string;
  officialUrl?: string;
}

export interface LegislativeProposal {
  id: string;
  source: LegislativeSource;
  sourceId: string;
  title: string;
  type: string;
  number?: string;
  year?: number;
  subject?: string;
  status?: string;
  currentStage?: string;
  relationship?: string;
  presentedAt?: string;
  officialSummary?: string;
  simplifiedSummary?: string;
  officialUrl?: string;
  officialFullTextUrl?: string;
  references: ExternalReference[];
}

export interface RollCallVote {
  id: string;
  source: LegislativeSource;
  sourceId?: string;
  proposalId: string;
  votedAt?: string;
  description: string;
  result?: string;
  counts?: VoteCounts;
  individualVotes: IndividualVote[];
}

// eslint-disable-next-line no-restricted-syntax
export interface ParliamentarianVoteView {
  id: string;
  parliamentarianId: string;
  billIdentification: string;
  chamber: string;
  description: string;
  parliamentarianVote?: DisplayVotePosition;
  parliamentarianVoteNotice?: string;
  votedAt?: string;
  officialResult?: string;
  counts?: VoteCounts;
  individualVotes: ParliamentarianVoteIndividualView[];
}

export interface ParliamentarianVoteIndividualView {
  parliamentarianName: string;
  party: string;
  state: string;
  vote: DisplayVotePosition;
  isSelectedParliamentarian?: boolean;
}

export interface IndividualVote {
  parliamentarianId?: string;
  parliamentarianName: string;
  party?: string;
  state?: string;
  vote: VotePosition;
}

export interface ExternalReference {
  id: string;
  type: ExternalReferenceType;
  title: string;
  publisher: string;
  url: string;
  checkedAt?: string;
}
