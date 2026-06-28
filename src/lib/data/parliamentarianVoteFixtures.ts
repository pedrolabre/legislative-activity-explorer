export type VotePosition = 'SIM' | 'NÃO' | 'ABSTENÇÃO' | 'AUSENTE';

export interface VoteCounts {
  yes: number;
  no: number;
  abstention: number;
  absent: number;
}

export interface IndividualVote {
  parliamentarianName: string;
  party: string;
  state: string;
  vote: VotePosition;
}

export interface ParliamentarianVote {
  id: string;
  parliamentarianId: string;
  billIdentification: string;
  chamber: string;
  description: string;
  parliamentarianVote: VotePosition;
  votedAt?: string;
  officialResult?: string;
  counts?: VoteCounts;
  individualVotes: IndividualVote[];
}

export const votePositions: VotePosition[] = ['SIM', 'NÃO', 'ABSTENÇÃO', 'AUSENTE'];

const parliamentarianVotes: ParliamentarianVote[] = [
  {
    id: 'vote-pl-1234-2024-texto-base',
    parliamentarianId: 'parliamentarian-ana-costa',
    billIdentification: 'PL 1234/2024',
    chamber: 'Câmara dos Deputados',
    votedAt: '2024-06-12',
    description: 'Deliberação nominal sobre o texto-base da proposição em sessão plenária.',
    officialResult: 'Aprovado',
    parliamentarianVote: 'SIM',
    counts: {
      yes: 312,
      no: 112,
      abstention: 8,
      absent: 81
    },
    individualVotes: [
      {
        parliamentarianName: 'Ana Costa',
        party: 'Partido A',
        state: 'MG',
        vote: 'SIM'
      },
      {
        parliamentarianName: 'Carlos Lima',
        party: 'Partido C',
        state: 'BA',
        vote: 'NÃO'
      },
      {
        parliamentarianName: 'Marina Rocha',
        party: 'Partido D',
        state: 'PE',
        vote: 'ABSTENÇÃO'
      },
      {
        parliamentarianName: 'Renata Silva',
        party: 'Partido E',
        state: 'SP',
        vote: 'AUSENTE'
      }
    ]
  },
  {
    id: 'vote-pl-220-2025-comissao',
    parliamentarianId: 'parliamentarian-ana-costa',
    billIdentification: 'PL 220/2025',
    chamber: 'Câmara dos Deputados',
    description: 'Deliberação em comissão sobre requerimento relacionado à proposição.',
    parliamentarianVote: 'AUSENTE',
    individualVotes: []
  },
  {
    id: 'vote-pec-45-2023-turno-unico',
    parliamentarianId: 'parliamentarian-bruno-ribeiro',
    billIdentification: 'PEC 45/2023',
    chamber: 'Senado Federal',
    votedAt: '2023-11-08',
    description: 'Deliberação nominal em turno único sobre a proposição.',
    officialResult: 'Aprovado',
    parliamentarianVote: 'ABSTENÇÃO',
    counts: {
      yes: 48,
      no: 19,
      abstention: 4,
      absent: 10
    },
    individualVotes: [
      {
        parliamentarianName: 'Bruno Ribeiro',
        party: 'Partido B',
        state: 'RS',
        vote: 'ABSTENÇÃO'
      },
      {
        parliamentarianName: 'Helena Duarte',
        party: 'Partido F',
        state: 'GO',
        vote: 'SIM'
      },
      {
        parliamentarianName: 'João Martins',
        party: 'Partido G',
        state: 'AM',
        vote: 'NÃO'
      },
      {
        parliamentarianName: 'Luiza Pereira',
        party: 'Partido H',
        state: 'CE',
        vote: 'AUSENTE'
      }
    ]
  }
];

function sortIndividualVotes(votes: IndividualVote[]) {
  return [...votes].sort((first, second) =>
    first.parliamentarianName.localeCompare(second.parliamentarianName, 'pt-BR', {
      sensitivity: 'base'
    })
  );
}

function sortVotesByDate(votes: ParliamentarianVote[]) {
  return [...votes].sort((first, second) => {
    const firstTime = first.votedAt ? Date.parse(first.votedAt) : Number.NEGATIVE_INFINITY;
    const secondTime = second.votedAt ? Date.parse(second.votedAt) : Number.NEGATIVE_INFINITY;

    if (firstTime !== secondTime) {
      return secondTime - firstTime;
    }

    return first.billIdentification.localeCompare(second.billIdentification, 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    });
  });
}

function normalizeVote(vote: ParliamentarianVote): ParliamentarianVote {
  return {
    ...vote,
    individualVotes: sortIndividualVotes(vote.individualVotes)
  };
}

export function getVotesByParliamentarianId(parliamentarianId: string) {
  return sortVotesByDate(
    parliamentarianVotes
      .filter((vote) => vote.parliamentarianId === parliamentarianId)
      .map(normalizeVote)
  );
}

export function getVoteById(id: string) {
  const vote = parliamentarianVotes.find((currentVote) => currentVote.id === id);

  return vote ? normalizeVote(vote) : undefined;
}
