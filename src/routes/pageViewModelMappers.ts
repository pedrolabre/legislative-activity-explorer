import {
  toDisplayVotePosition,
  type DisplayVotePosition,
  type LegislativeProposal,
  type Parliamentarian,
  type ParliamentarianVoteView,
  type RollCallVote
} from '$lib/domain';
import {
  officialParliamentarianSessionVotesCoverageMessage,
  officialParliamentarianSessionVotesEmptyMessage,
  officialParliamentarianStaticCoverageDescription,
  officialSenadoAssociatedMattersEmptyMessage,
  officialSenadoAssociatedMattersUnavailableDescription,
  officialSenadoProposalVotesEmptyMessage,
  unavailableNominalVoteListLabel,
  unavailableOfficialFieldLabel,
  unavailableVersionFieldLabel
} from '$lib/ui/officialMessages';

export interface SearchResultsView {
  parliamentarians: {
    kind: 'parliamentarian';
    id: string;
    name: string;
    office: string;
    chamber?: string;
    party: string;
    state: string;
    status: string;
    term?: string;
    searchTerms: string[];
  }[];
  proposals: {
    kind: 'proposal';
    id: string;
    title: string;
    chamber: string;
    type?: string;
    subjectLabel?: string;
    subject?: string;
    status: string;
    searchTerms: string[];
  }[];
}

export interface ParliamentarianDetailView {
  id: string;
  name: string;
  fullName?: string;
  office: string;
  chamber: string;
  party: string;
  state: string;
  status: string;
  term?: string;
  termLabel?: string;
  email?: string;
  photoUrl?: string;
}

export interface ParliamentarianBillView {
  id: string;
  parliamentarianId: string;
  identification: string;
  chamber: string;
  type: string;
  number?: string;
  year?: number;
  subjectLabel?: string;
  subject?: string;
  status: string;
  currentStageLabel?: string;
  currentStage?: string;
  relationship: string;
  authorship?: string;
  presentedAt?: string;
  officialSummary: string;
  factualSummary?: string;
  officialFullTextUrl?: string;
  sources: {
    id: string;
    type: 'official' | 'press' | 'technical' | 'institutional';
    label: string;
    title: string;
    publisher: string;
    url: string;
    checkedAt?: string;
  }[];
}

export function getChamberLabel(
  source: Parliamentarian['source'] | LegislativeProposal['source']
): string {
  return source === 'senado' ? 'Senado Federal' : 'Câmara dos Deputados';
}

export function getSubjectLabel(proposal: LegislativeProposal): string {
  return isOfficialSenadoProposal(proposal) ? 'Natureza' : 'Tema';
}

export function toSearchParliamentarianResult(parliamentarian: Parliamentarian) {
  return {
    kind: 'parliamentarian' as const,
    id: parliamentarian.id,
    name: parliamentarian.name,
    office: parliamentarian.office,
    chamber: getChamberLabel(parliamentarian.source),
    party: parliamentarian.party ?? unavailableOfficialFieldLabel,
    state: parliamentarian.state ?? unavailableOfficialFieldLabel,
    status: parliamentarian.status ?? unavailableOfficialFieldLabel,
    term: parliamentarian.term,
    searchTerms: []
  };
}

export function toSearchProposalResult(proposal: LegislativeProposal) {
  return {
    kind: 'proposal' as const,
    id: proposal.id,
    title: proposal.title,
    chamber: getChamberLabel(proposal.source),
    type: proposal.type,
    subjectLabel: proposal.subject ? getSubjectLabel(proposal) : undefined,
    subject: proposal.subject,
    status: proposal.status ?? unavailableOfficialFieldLabel,
    searchTerms: []
  };
}

export function toParliamentarianDetailView(
  parliamentarian: Parliamentarian
): ParliamentarianDetailView {
  return {
    id: parliamentarian.id,
    name: parliamentarian.name,
    fullName: parliamentarian.fullName,
    office: parliamentarian.office,
    chamber: getChamberLabel(parliamentarian.source),
    party: parliamentarian.party ?? unavailableOfficialFieldLabel,
    state: parliamentarian.state ?? unavailableOfficialFieldLabel,
    status: parliamentarian.status ?? unavailableOfficialFieldLabel,
    term: parliamentarian.term,
    termLabel: parliamentarian.termLabel,
    email: parliamentarian.email,
    photoUrl: parliamentarian.photoUrl
  };
}

export function getReferenceLabel(
  reference: LegislativeProposal['references'][number]
): string {
  if (reference.type === 'official') {
    return 'Fonte oficial';
  }

  if (reference.type === 'press') {
    return 'Cobertura de imprensa';
  }

  if (reference.type === 'institutional') {
    return 'Fonte institucional';
  }

  return 'Referência técnica';
}

export function toParliamentarianBillView(
  proposal: LegislativeProposal,
  parliamentarianId?: string
): ParliamentarianBillView {
  const hasReviewedFactualSummary = Boolean(proposal.simplifiedSummary?.trim());

  return {
    id: proposal.id,
    parliamentarianId: parliamentarianId ?? '',
    identification: proposal.title,
    chamber: getChamberLabel(proposal.source),
    type: proposal.type,
    number: proposal.number,
    year: proposal.year,
    subjectLabel: getSubjectLabel(proposal),
    subject: proposal.subject,
    status: proposal.status ?? unavailableOfficialFieldLabel,
    currentStageLabel:
      proposal.source === 'camara'
        ? 'Tramitação atual'
        : proposal.currentStage
          ? 'Tramitação ou decisão'
          : undefined,
    currentStage: proposal.currentStage,
    relationship: parliamentarianId
      ? proposal.relationship ?? unavailableVersionFieldLabel
      : proposal.relationship ?? '',
    authorship: proposal.authorship,
    presentedAt: proposal.presentedAt,
    officialSummary: proposal.officialSummary ?? unavailableOfficialFieldLabel,
    factualSummary: hasReviewedFactualSummary ? proposal.simplifiedSummary : undefined,
    officialFullTextUrl: proposal.officialFullTextUrl,
    sources: proposal.references.map((reference) => ({
      id: reference.id,
      type: reference.type,
      label: getReferenceLabel(reference),
      title: reference.title,
      publisher: reference.publisher,
      url: reference.url,
      checkedAt: reference.checkedAt
    }))
  };
}

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function isOfficialCamaraProposal(proposal: LegislativeProposal): boolean {
  return proposal.source === 'camara' && proposal.id === `camara-proposicao-${proposal.sourceId}`;
}

export function isOfficialSenadoProposal(proposal: LegislativeProposal): boolean {
  return (
    proposal.source === 'senado' &&
    (proposal.id === `senado-materia-${proposal.sourceId}` ||
      proposal.id === `senado-processo-${proposal.sourceId}`)
  );
}

export function isOfficialParliamentarian(parliamentarian: Parliamentarian): boolean {
  return parliamentarian.id === `${parliamentarian.source}-${parliamentarian.sourceId}`;
}

export function isIndividualVoteForParliamentarian(
  individualVote: RollCallVote['individualVotes'][number],
  parliamentarian: Parliamentarian
): boolean {
  if (individualVote.parliamentarianId) {
    return individualVote.parliamentarianId === parliamentarian.id;
  }

  return normalizeName(individualVote.parliamentarianName) === normalizeName(parliamentarian.name);
}

export function getParliamentarianVote(
  vote: RollCallVote,
  parliamentarian: Parliamentarian
): DisplayVotePosition | undefined {
  const individualVote = vote.individualVotes.find((currentVote) =>
    isIndividualVoteForParliamentarian(currentVote, parliamentarian)
  );

  return individualVote ? toDisplayVotePosition(individualVote.vote) : undefined;
}

export function getParliamentarianVoteNotice(
  vote: RollCallVote,
  parliamentarianVote?: DisplayVotePosition
): string | undefined {
  if (parliamentarianVote) {
    return undefined;
  }

  if (vote.individualVotes.length > 0) {
    return 'Voto individual do parlamentar não localizado na lista nominal oficial.';
  }

  return unavailableNominalVoteListLabel;
}

export function toParliamentarianVoteView(
  vote: RollCallVote,
  parliamentarian: Parliamentarian
): ParliamentarianVoteView {
  const parliamentarianVote = getParliamentarianVote(vote, parliamentarian);

  return {
    id: vote.id,
    parliamentarianId: parliamentarian.id,
    billIdentification: vote.proposalId,
    chamber: getChamberLabel(vote.source),
    description: vote.description,
    parliamentarianVote,
    parliamentarianVoteNotice: getParliamentarianVoteNotice(vote, parliamentarianVote),
    votedAt: vote.votedAt,
    officialResult: vote.result,
    counts: vote.counts,
    individualVotes: vote.individualVotes.map((individualVote) => ({
      parliamentarianName: individualVote.parliamentarianName,
      party: individualVote.party ?? unavailableOfficialFieldLabel,
      state: individualVote.state ?? unavailableOfficialFieldLabel,
      vote: toDisplayVotePosition(individualVote.vote),
      isSelectedParliamentarian: isIndividualVoteForParliamentarian(
        individualVote,
        parliamentarian
      )
    }))
  };
}

export function toProposalVoteView(vote: RollCallVote): ParliamentarianVoteView {
  return {
    id: vote.id,
    parliamentarianId: '',
    billIdentification: vote.proposalId,
    chamber: getChamberLabel(vote.source),
    description: vote.description,
    votedAt: vote.votedAt,
    officialResult: vote.result,
    counts: vote.counts,
    individualVotes: vote.individualVotes.map((individualVote) => ({
      parliamentarianName: individualVote.parliamentarianName,
      party: individualVote.party ?? unavailableOfficialFieldLabel,
      state: individualVote.state ?? unavailableOfficialFieldLabel,
      vote: toDisplayVotePosition(individualVote.vote)
    }))
  };
}

export function toParliamentarianBillViews(
  proposals: LegislativeProposal[],
  parliamentarian: Parliamentarian | null
): ParliamentarianBillView[] {
  if (!parliamentarian) {
    return [];
  }

  return proposals.map((proposal) => toParliamentarianBillView(proposal, parliamentarian.id));
}

export function toParliamentarianVoteViews(
  votes: RollCallVote[],
  parliamentarian: Parliamentarian | null
): ParliamentarianVoteView[] {
  if (!parliamentarian) {
    return [];
  }

  return votes.map((vote) => toParliamentarianVoteView(vote, parliamentarian));
}

export function toProposalVoteViews(votes: RollCallVote[]): ParliamentarianVoteView[] {
  return votes.map(toProposalVoteView);
}

export interface ParliamentarianBillsFeedback {
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface ParliamentarianVotesFeedback {
  coverageDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export interface ProposalVotesFeedback {
  showOfficialVotes: boolean;
  officialVotesTitle: string;
  officialVotesEmptyMessage?: string;
}

export function getParliamentarianBillsFeedback(
  parliamentarian: Parliamentarian | null
): ParliamentarianBillsFeedback {
  const isOfficialSenado = Boolean(
    parliamentarian && isOfficialParliamentarian(parliamentarian) && parliamentarian.source === 'senado'
  );

  return {
    emptyTitle: isOfficialSenado ? officialSenadoAssociatedMattersEmptyMessage : undefined,
    emptyDescription: isOfficialSenado ? officialSenadoAssociatedMattersUnavailableDescription : undefined
  };
}

export function getParliamentarianVotesFeedback(
  parliamentarian: Parliamentarian | null,
  hasVotes: boolean
): ParliamentarianVotesFeedback {
  const isOfficial = Boolean(parliamentarian && isOfficialParliamentarian(parliamentarian));

  return {
    coverageDescription:
      isOfficial && hasVotes ? officialParliamentarianSessionVotesCoverageMessage : undefined,
    emptyTitle: isOfficial ? officialParliamentarianSessionVotesEmptyMessage : undefined,
    emptyDescription: isOfficial ? officialParliamentarianStaticCoverageDescription : undefined
  };
}

export function getProposalVotesFeedback(
  proposal: LegislativeProposal | null
): ProposalVotesFeedback {
  if (!proposal) {
    return {
      showOfficialVotes: false,
      officialVotesTitle: 'Votações da Câmara',
      officialVotesEmptyMessage: undefined
    };
  }

  const isCamara = isOfficialCamaraProposal(proposal);
  const isSenado = isOfficialSenadoProposal(proposal);

  return {
    showOfficialVotes: isCamara || isSenado,
    officialVotesTitle: isSenado ? 'Votações do Senado' : 'Votações da Câmara',
    officialVotesEmptyMessage: isSenado ? officialSenadoProposalVotesEmptyMessage : undefined
  };
}

