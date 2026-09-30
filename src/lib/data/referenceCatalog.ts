import type { ExternalReference, ExternalReferenceType } from '$lib/domain';
import {
  generateProposalLookupCandidates,
  matchesCatalogEntry,
  type ProposalLookupInput,
  type ProposalLookupTarget
} from './factualSummaryCatalog';

export interface ReferenceCatalogEntry {
  proposalId: string;
  canonicalId?: string;
  aliases?: readonly string[];
  reference: ExternalReference;
}

export type { ProposalLookupInput, ProposalLookupTarget };

export const referenceCatalog: ReferenceCatalogEntry[] = [
  {
    proposalId: 'bill-pl-1234-2024',
    canonicalId: 'pl-1234-2024',
    aliases: ['camara-proposicao-1234', 'PL 1234/2024', 'PL 1234'],
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
    canonicalId: 'pl-1234-2024',
    aliases: ['camara-proposicao-1234', 'PL 1234/2024', 'PL 1234'],
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
    canonicalId: 'pl-1234-2024',
    aliases: ['camara-proposicao-1234', 'PL 1234/2024', 'PL 1234'],
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
    canonicalId: 'pl-220-2025',
    aliases: ['camara-proposicao-220', 'PL 220/2025', 'PL 220'],
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
    canonicalId: 'pec-45-2023',
    aliases: ['senado-materia-45', 'senado-processo-45', 'PEC 45/2023', 'PEC 45'],
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
    canonicalId: 'pec-45-2023',
    aliases: ['senado-materia-45', 'senado-processo-45', 'PEC 45/2023', 'PEC 45'],
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
    canonicalId: 'pec-45-2023',
    aliases: ['senado-materia-45', 'senado-processo-45', 'PEC 45/2023', 'PEC 45'],
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

export function findReferenceCatalogEntries(
  lookup: ProposalLookupInput
): ReferenceCatalogEntry[] {
  const candidateTokens = new Set(generateProposalLookupCandidates(lookup));

  return referenceCatalog.filter((entry) => matchesCatalogEntry(entry, candidateTokens));
}

export function findReferencesForProposal(
  lookup: ProposalLookupInput
): ExternalReference[] {
  return findReferenceCatalogEntries(lookup).map((entry) => entry.reference);
}

export function getReferencesByProposalId(proposalId: string): ExternalReference[] {
  return findReferencesForProposal(proposalId);
}

export function getReferenceCatalogEntriesByType(
  type: ExternalReferenceType
): ReferenceCatalogEntry[] {
  return referenceCatalog.filter((entry) => entry.reference.type === type);
}
