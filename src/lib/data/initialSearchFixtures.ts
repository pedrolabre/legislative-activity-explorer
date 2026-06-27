export type InitialSearchResultKind = 'parliamentarian' | 'proposal';

export interface InitialSearchParliamentarianResult {
  kind: 'parliamentarian';
  id: string;
  name: string;
  office: string;
  party: string;
  state: string;
  status: string;
  searchTerms: string[];
}

export interface InitialSearchProposalResult {
  kind: 'proposal';
  id: string;
  title: string;
  chamber: string;
  subject: string;
  status: string;
  searchTerms: string[];
}

export interface InitialSearchResults {
  parliamentarians: InitialSearchParliamentarianResult[];
  proposals: InitialSearchProposalResult[];
}

const parliamentarianFixtures: InitialSearchParliamentarianResult[] = [
  {
    kind: 'parliamentarian',
    id: 'parliamentarian-ana-costa',
    name: 'Ana Costa',
    office: 'Deputada federal',
    party: 'Partido A',
    state: 'MG',
    status: 'Em exercício',
    searchTerms: ['ana', 'ana costa', 'camara', 'educacao', 'minas gerais']
  },
  {
    kind: 'parliamentarian',
    id: 'parliamentarian-bruno-ribeiro',
    name: 'Bruno Ribeiro',
    office: 'Senador',
    party: 'Partido B',
    state: 'RS',
    status: 'Em exercício',
    searchTerms: ['bruno', 'bruno ribeiro', 'rio grande do sul', 'saude', 'senado']
  }
];

const proposalFixtures: InitialSearchProposalResult[] = [
  {
    kind: 'proposal',
    id: 'proposal-pl-1234-2024',
    title: 'PL 1234/2024',
    chamber: 'Câmara dos Deputados',
    subject: 'Educação',
    status: 'Registro de exemplo',
    searchTerms: ['pl 1234', 'pl 1234/2024', 'projeto de lei 1234', 'educacao']
  },
  {
    kind: 'proposal',
    id: 'proposal-pec-45-2023',
    title: 'PEC 45/2023',
    chamber: 'Senado Federal',
    subject: 'Saúde pública',
    status: 'Registro de exemplo',
    searchTerms: ['pec 45', 'pec 45/2023', 'proposta de emenda', 'saude']
  }
];

export const emptyInitialSearchResults: InitialSearchResults = {
  parliamentarians: [],
  proposals: []
};

function normalizeSearchTerm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function matchesSearchTerm(searchTerms: string[], normalizedQuery: string) {
  return searchTerms.some((term) => {
    const normalizedTerm = normalizeSearchTerm(term);

    return normalizedTerm.includes(normalizedQuery) || normalizedQuery.includes(normalizedTerm);
  });
}

function sortParliamentarians(results: InitialSearchParliamentarianResult[]) {
  return [...results].sort((first, second) =>
    first.name.localeCompare(second.name, 'pt-BR', { sensitivity: 'base' })
  );
}

function sortProposals(results: InitialSearchProposalResult[]) {
  return [...results].sort((first, second) =>
    first.title.localeCompare(second.title, 'pt-BR', { numeric: true, sensitivity: 'base' })
  );
}

export function findInitialSearchResults(query: string): InitialSearchResults {
  const normalizedQuery = normalizeSearchTerm(query);

  if (!normalizedQuery) {
    return emptyInitialSearchResults;
  }

  return {
    parliamentarians: sortParliamentarians(
      parliamentarianFixtures.filter((result) =>
        matchesSearchTerm(result.searchTerms, normalizedQuery)
      )
    ),
    proposals: sortProposals(
      proposalFixtures.filter((result) => matchesSearchTerm(result.searchTerms, normalizedQuery))
    )
  };
}
