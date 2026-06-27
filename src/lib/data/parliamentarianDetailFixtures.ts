export interface ParliamentarianDetail {
  id: string;
  name: string;
  fullName?: string;
  office: string;
  chamber: string;
  party: string;
  state: string;
  status: string;
  term?: string;
  email?: string;
  photoUrl?: string;
}

const parliamentarianDetails: ParliamentarianDetail[] = [
  {
    id: 'parliamentarian-ana-costa',
    name: 'Ana Costa',
    fullName: 'Ana Maria Costa',
    office: 'Deputada federal',
    chamber: 'Câmara dos Deputados',
    party: 'Partido A',
    state: 'MG',
    status: 'Em exercício',
    term: '2023-2027',
    email: 'ana.costa@camara.leg.br',
    photoUrl: '/parliamentarians/ana-costa.svg'
  },
  {
    id: 'parliamentarian-bruno-ribeiro',
    name: 'Bruno Ribeiro',
    office: 'Senador',
    chamber: 'Senado Federal',
    party: 'Partido B',
    state: 'RS',
    status: 'Em exercício',
    term: '2019-2027'
  }
];

export function getParliamentarianDetailById(id: string) {
  return parliamentarianDetails.find((parliamentarian) => parliamentarian.id === id);
}
