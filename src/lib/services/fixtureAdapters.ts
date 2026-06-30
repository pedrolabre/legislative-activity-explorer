import type {
  InitialSearchParliamentarianResult,
  InitialSearchProposalResult
} from '$lib/data/initialSearchFixtures';
import type { ParliamentarianBill, BillSource } from '$lib/data/parliamentarianBillFixtures';
import type {
  ParliamentarianVote,
  VotePosition as FixtureVotePosition
} from '$lib/data/parliamentarianVoteFixtures';
import type { ParliamentarianDetail } from '$lib/data/parliamentarianDetailFixtures';
import type {
  LegislativeProposal,
  LegislativeSource,
  Parliamentarian,
  RollCallVote,
  VotePosition
} from '$lib/domain';

function inferLegislativeSource(value: string): LegislativeSource {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

  return normalized.includes('senado') || normalized.includes('senador') ? 'senado' : 'camara';
}

function parseProposalTitle(title: string) {
  const match = title.match(/^([A-Z]+)\s+(\d+)\/(\d{4})$/);

  if (!match) {
    return {
      type: title,
      number: undefined,
      year: undefined
    };
  }

  return {
    type: match[1],
    number: match[2],
    year: Number(match[3])
  };
}

function normalizeVotePosition(vote: FixtureVotePosition): VotePosition {
  const normalized = vote
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR');

  if (normalized === 'NAO') {
    return 'NAO';
  }

  if (normalized === 'ABSTENCAO') {
    return 'ABSTENCAO';
  }

  if (normalized === 'AUSENTE') {
    return 'AUSENTE';
  }

  return 'SIM';
}

export function mapSearchParliamentarianToDomain(
  result: InitialSearchParliamentarianResult
): Parliamentarian {
  return {
    id: result.id,
    source: inferLegislativeSource(result.office),
    sourceId: result.id,
    name: result.name,
    office: result.office,
    party: result.party,
    state: result.state,
    status: result.status
  };
}

export function mapSearchProposalToDomain(result: InitialSearchProposalResult): LegislativeProposal {
  const parsedTitle = parseProposalTitle(result.title);

  return {
    id: result.id,
    source: inferLegislativeSource(result.chamber),
    sourceId: result.id,
    title: result.title,
    type: parsedTitle.type,
    number: parsedTitle.number,
    year: parsedTitle.year,
    subject: result.subject,
    status: result.status,
    references: []
  };
}

export function mapParliamentarianDetailToDomain(
  parliamentarian: ParliamentarianDetail
): Parliamentarian {
  return {
    id: parliamentarian.id,
    source: inferLegislativeSource(parliamentarian.chamber),
    sourceId: parliamentarian.id,
    name: parliamentarian.name,
    fullName: parliamentarian.fullName,
    office: parliamentarian.office,
    party: parliamentarian.party,
    state: parliamentarian.state,
    status: parliamentarian.status,
    term: parliamentarian.term,
    photoUrl: parliamentarian.photoUrl,
    email: parliamentarian.email
  };
}

function mapBillSourceToDomain(source: BillSource): LegislativeProposal['references'][number] {
  return {
    id: source.id,
    type: source.type === 'official' ? 'official' : 'technical',
    title: source.title,
    publisher: source.publisher,
    url: source.url
  };
}

export function mapBillToDomain(bill: ParliamentarianBill): LegislativeProposal {
  const parsedTitle = parseProposalTitle(bill.identification);
  const references = bill.sources.map(mapBillSourceToDomain);

  return {
    id: bill.id,
    source: inferLegislativeSource(bill.chamber),
    sourceId: bill.id,
    title: bill.identification,
    type: parsedTitle.type,
    number: parsedTitle.number,
    year: parsedTitle.year,
    subject: bill.subject,
    status: bill.status,
    relationship: bill.relationship,
    presentedAt: bill.presentedAt,
    officialSummary: bill.officialSummary,
    officialUrl: references.find((reference) => reference.type === 'official')?.url,
    references
  };
}

export function mapVoteToDomain(vote: ParliamentarianVote): RollCallVote {
  return {
    id: vote.id,
    source: inferLegislativeSource(vote.chamber),
    sourceId: vote.id,
    proposalId: vote.billIdentification,
    votedAt: vote.votedAt,
    description: vote.description,
    result: vote.officialResult,
    counts: vote.counts
      ? {
          yes: vote.counts.yes,
          no: vote.counts.no,
          abstention: vote.counts.abstention,
          absent: vote.counts.absent
        }
      : undefined,
    individualVotes: vote.individualVotes.map((individualVote) => ({
      parliamentarianName: individualVote.parliamentarianName,
      party: individualVote.party,
      state: individualVote.state,
      vote: normalizeVotePosition(individualVote.vote)
    }))
  };
}
