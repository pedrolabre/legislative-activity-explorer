import type { LegislativeProposal, Parliamentarian } from '$lib/domain';
import type { CamaraDeputadoPayload, CamaraProposicaoPayload } from '$lib/api/camaraClient';

const camaraDeputadoOfficialUrl = 'https://www.camara.leg.br/deputados';
const camaraProposicaoOfficialUrl = 'https://www.camara.leg.br/propostas-legislativas';
const camaraPublisher = 'Câmara dos Deputados';

export class CamaraMapperError extends Error {
  entity: string;
  field: string;

  constructor(entity: string, field: string) {
    super(`Payload da Camara sem campo obrigatorio: ${entity}.${field}.`);
    this.name = 'CamaraMapperError';
    this.entity = entity;
    this.field = field;
  }
}

function normalizeString(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized ? normalized : undefined;
}

function normalizeNumber(value: string | number | null | undefined): number | undefined {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDate(value: string | null | undefined): string | undefined {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  const dateMatch = normalized.match(/^\d{4}-\d{2}-\d{2}/);

  return dateMatch ? dateMatch[0] : normalized;
}

function requireSourceId(
  entity: 'deputado' | 'proposicao',
  value: string | number | null | undefined
) {
  const sourceId = normalizeString(value);

  if (!sourceId) {
    throw new CamaraMapperError(entity, 'id');
  }

  return sourceId;
}

function buildProposicaoTitle(payload: CamaraProposicaoPayload, sourceId: string) {
  const type = normalizeString(payload.siglaTipo) ?? normalizeString(payload.descricaoTipo);
  const number = normalizeString(payload.numero);
  const year = normalizeNumber(payload.ano);

  if (type && number && year) {
    return `${type} ${number}/${year}`;
  }

  if (type && number) {
    return `${type} ${number}`;
  }

  if (type) {
    return type;
  }

  return `Proposição ${sourceId}`;
}

export function mapCamaraDeputadoToParliamentarian(
  payload: CamaraDeputadoPayload
): Parliamentarian {
  const sourceId = requireSourceId('deputado', payload.id);
  const status = payload.ultimoStatus;
  const name =
    normalizeString(status?.nomeEleitoral) ??
    normalizeString(status?.nome) ??
    normalizeString(payload.nomeCivil) ??
    `Deputado federal ${sourceId}`;

  return {
    id: `camara-${sourceId}`,
    source: 'camara',
    sourceId,
    name,
    fullName: normalizeString(payload.nomeCivil),
    office: 'Deputado federal',
    party: normalizeString(status?.siglaPartido),
    state: normalizeString(status?.siglaUf),
    status: normalizeString(status?.situacao),
    photoUrl: normalizeString(status?.urlFoto),
    email: normalizeString(status?.email),
    officialUrl: `${camaraDeputadoOfficialUrl}/${sourceId}`
  };
}

export function mapCamaraProposicaoToLegislativeProposal(
  payload: CamaraProposicaoPayload
): LegislativeProposal {
  const sourceId = requireSourceId('proposicao', payload.id);
  const title = buildProposicaoTitle(payload, sourceId);
  const officialUrl = `${camaraProposicaoOfficialUrl}/${sourceId}`;

  return {
    id: `camara-proposicao-${sourceId}`,
    source: 'camara',
    sourceId,
    title,
    type:
      normalizeString(payload.siglaTipo) ??
      normalizeString(payload.descricaoTipo) ??
      'Proposição',
    number: normalizeString(payload.numero),
    year: normalizeNumber(payload.ano),
    status:
      normalizeString(payload.statusProposicao?.descricaoSituacao) ??
      normalizeString(payload.statusProposicao?.regime),
    presentedAt: normalizeDate(payload.dataApresentacao),
    officialSummary: normalizeString(payload.ementa),
    officialUrl,
    references: [
      {
        id: `camara-proposicao-${sourceId}-fonte-oficial`,
        type: 'official',
        title: 'Página oficial da proposição',
        publisher: camaraPublisher,
        url: officialUrl
      }
    ]
  };
}

export function mapCamaraProposicoesToLegislativeProposals(
  payloads: CamaraProposicaoPayload[]
): LegislativeProposal[] {
  return payloads.map(mapCamaraProposicaoToLegislativeProposal);
}
