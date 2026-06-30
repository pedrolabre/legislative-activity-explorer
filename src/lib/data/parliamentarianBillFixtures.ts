export type BillSourceType = 'official' | 'institutional';

export interface BillSource {
  id: string;
  type: BillSourceType;
  label: string;
  title: string;
  publisher: string;
  url: string;
}

export interface ParliamentarianBill {
  id: string;
  parliamentarianId: string;
  identification: string;
  chamber: string;
  subject: string;
  status: string;
  relationship: string;
  presentedAt?: string;
  officialSummary: string;
  sources: BillSource[];
}

const parliamentarianBills: ParliamentarianBill[] = [
  {
    id: 'bill-pl-1234-2024',
    parliamentarianId: 'parliamentarian-ana-costa',
    identification: 'PL 1234/2024',
    chamber: 'Câmara dos Deputados',
    subject: 'Educação',
    status: 'Aguardando despacho da Mesa',
    relationship: 'Autoria',
    presentedAt: '2024-03-15',
    officialSummary:
      'Dispõe sobre diretrizes para transparência de informações educacionais em instituições públicas de ensino.',
    sources: [
      {
        id: 'source-pl-1234-official',
        type: 'official',
        label: 'Fonte oficial',
        title: 'Página pública da proposição',
        publisher: 'Câmara dos Deputados',
        url: 'https://www.camara.leg.br/propostas-legislativas/1234'
      },
      {
        id: 'source-pl-1234-institutional',
        type: 'institutional',
        label: 'Referência institucional',
        title: 'Material de referência legislativa',
        publisher: 'Câmara dos Deputados',
        url: 'https://www2.camara.leg.br/atividade-legislativa/estudos-e-notas-tecnicas'
      }
    ]
  },
  {
    id: 'bill-pl-220-2025',
    parliamentarianId: 'parliamentarian-ana-costa',
    identification: 'PL 220/2025',
    chamber: 'Câmara dos Deputados',
    subject: 'Direitos do consumidor',
    status: 'Apensado a outra proposição',
    relationship: 'Autoria',
    officialSummary:
      'Altera normas sobre comunicação de reajustes em contratos de prestação continuada.',
    sources: []
  },
  {
    id: 'bill-pec-45-2023',
    parliamentarianId: 'parliamentarian-bruno-ribeiro',
    identification: 'PEC 45/2023',
    chamber: 'Senado Federal',
    subject: 'Saúde pública',
    status: 'Em análise na comissão',
    relationship: 'Relatoria',
    officialSummary:
      'Altera dispositivos constitucionais relacionados ao financiamento de ações públicas de saúde.',
    sources: [
      {
        id: 'source-pec-45-official',
        type: 'official',
        label: 'Fonte oficial',
        title: 'Página pública da proposição',
        publisher: 'Senado Federal',
        url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/45'
      }
    ]
  }
];

function sortBillsByIdentification(bills: ParliamentarianBill[]) {
  return [...bills].sort((first, second) =>
    first.identification.localeCompare(second.identification, 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    })
  );
}

export function getBillsByParliamentarianId(parliamentarianId: string) {
  return sortBillsByIdentification(
    parliamentarianBills.filter((bill) => bill.parliamentarianId === parliamentarianId)
  );
}

export function getBillById(id: string) {
  return parliamentarianBills.find((bill) => bill.id === id);
}
