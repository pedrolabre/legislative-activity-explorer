import type { ExternalReference, ExternalReferenceType } from '$lib/domain';

export interface ReferenceCatalogEntry {
  proposalId: string;
  reference: ExternalReference;
}

export const referenceCatalog: ReferenceCatalogEntry[] = [
  {
    proposalId: 'bill-pl-1234-2024',
    reference: {
      id: 'bill-pl-1234-2024-official-camara',
      type: 'official',
      title: 'Página pública da proposição PL 1234/2024',
      publisher: 'Câmara dos Deputados',
      url: 'https://www.camara.leg.br/propostas-legislativas/1234',
      checkedAt: '2026-06-29'
    }
  },
  {
    proposalId: 'bill-pl-1234-2024',
    reference: {
      id: 'bill-pl-1234-2024-press-politica-g1',
      type: 'press',
      title: 'Seção de política nacional',
      publisher: 'G1',
      url: 'https://g1.globo.com/politica/',
      checkedAt: '2026-06-29'
    }
  },
  {
    proposalId: 'bill-pl-1234-2024',
    reference: {
      id: 'bill-pl-1234-2024-technical-estudos-camara',
      type: 'technical',
      title: 'Estudos e notas técnicas legislativas',
      publisher: 'Câmara dos Deputados',
      url: 'https://www2.camara.leg.br/atividade-legislativa/estudos-e-notas-tecnicas',
      checkedAt: '2026-06-29'
    }
  },
  {
    proposalId: 'bill-pl-220-2025',
    reference: {
      id: 'bill-pl-220-2025-official-camara',
      type: 'official',
      title: 'Página pública da proposição PL 220/2025',
      publisher: 'Câmara dos Deputados',
      url: 'https://www.camara.leg.br/propostas-legislativas/220',
      checkedAt: '2026-06-29'
    }
  },
  {
    proposalId: 'bill-pec-45-2023',
    reference: {
      id: 'bill-pec-45-2023-official-senado',
      type: 'official',
      title: 'Página pública da matéria PEC 45/2023',
      publisher: 'Senado Federal',
      url: 'https://www25.senado.leg.br/web/atividade/materias/-/materia/45',
      checkedAt: '2026-06-29'
    }
  },
  {
    proposalId: 'bill-pec-45-2023',
    reference: {
      id: 'bill-pec-45-2023-press-agencia-senado',
      type: 'press',
      title: 'Notícias do Senado Federal',
      publisher: 'Agência Senado',
      url: 'https://www12.senado.leg.br/noticias',
      checkedAt: '2026-06-29'
    }
  },
  {
    proposalId: 'bill-pec-45-2023',
    reference: {
      id: 'bill-pec-45-2023-technical-estudos-senado',
      type: 'technical',
      title: 'Estudos legislativos publicados pelo Senado',
      publisher: 'Senado Federal',
      url: 'https://www12.senado.leg.br/publicacoes/estudos-legislativos',
      checkedAt: '2026-06-29'
    }
  }
];

export function getReferencesByProposalId(proposalId: string): ExternalReference[] {
  return referenceCatalog
    .filter((entry) => entry.proposalId === proposalId)
    .map((entry) => entry.reference);
}

export function getReferenceCatalogEntriesByType(
  type: ExternalReferenceType
): ReferenceCatalogEntry[] {
  return referenceCatalog.filter((entry) => entry.reference.type === type);
}
