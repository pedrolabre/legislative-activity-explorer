import type { IndividualVote, LegislativeProposal, Parliamentarian, RollCallVote } from '$lib/domain';
import type {
  CamaraDeputadoPayload,
  CamaraProposicaoPayload,
  CamaraProposicaoTemaPayload,
  CamaraVotacaoPayload,
  CamaraVotoPayload
} from '$lib/api/camaraClient';

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

function requireVoteSourceId(entity: 'votacao', value: string | number | null | undefined) {
  const sourceId = normalizeString(value);

  if (!sourceId) {
    throw new CamaraMapperError(entity, 'id');
  }

  return sourceId;
}

function normalizeVoteLabel(value: string | null | undefined) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR');
}

function mapCamaraTipoVoto(value: string | null | undefined): IndividualVote['vote'] | undefined {
  const normalized = normalizeVoteLabel(value);

  if (normalized === 'SIM') {
    return 'SIM';
  }

  if (normalized === 'NAO') {
    return 'NAO';
  }

  if (normalized === 'ABSTENCAO') {
    return 'ABSTENCAO';
  }

  if (normalized === 'AUSENTE') {
    return 'AUSENTE';
  }

  return undefined;
}

function normalizeOfficialVoteResult(payload: CamaraVotacaoPayload) {
  return normalizeString(payload.resultado) ?? normalizeStringTextOnly(payload.aprovacao);
}

function normalizeStringTextOnly(value: string | number | boolean | null | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = normalizeString(value);

  if (!normalized || /^(0|1|true|false)$/i.test(normalized)) {
    return undefined;
  }

  return normalized;
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
    normalizeString(payload.nome) ??
    `Deputado federal ${sourceId}`;

  return {
    id: `camara-${sourceId}`,
    source: 'camara',
    sourceId,
    name,
    fullName: normalizeString(payload.nomeCivil),
    office: 'Deputado federal',
    party: normalizeString(status?.siglaPartido) ?? normalizeString(payload.siglaPartido),
    state: normalizeString(status?.siglaUf) ?? normalizeString(payload.siglaUf),
    status: normalizeString(status?.situacao),
    photoUrl: normalizeString(status?.urlFoto) ?? normalizeString(payload.urlFoto),
    email: normalizeString(status?.email) ?? normalizeString(payload.email),
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

export function mapCamaraProposicaoTemasToSubject(
  payloads: CamaraProposicaoTemaPayload[]
): string | undefined {
  const seenThemes = new Set<string>();
  const themes: string[] = [];

  for (const payload of payloads) {
    const theme = normalizeString(payload.tema);

    if (!theme) {
      continue;
    }

    const dedupeKey = theme.toLocaleLowerCase('pt-BR');

    if (seenThemes.has(dedupeKey)) {
      continue;
    }

    seenThemes.add(dedupeKey);
    themes.push(theme);
  }

  return themes.length > 0 ? themes.join('; ') : undefined;
}

export function mapCamaraVotacaoToRollCallVote(
  payload: CamaraVotacaoPayload,
  options: {
    proposalIdentification: string;
    individualVotes?: IndividualVote[];
  }
): RollCallVote {
  const sourceId = requireVoteSourceId('votacao', payload.id);
  const description =
    normalizeString(payload.descricao) ??
    normalizeString(payload.proposicaoObjeto) ??
    `Votacao oficial ${sourceId}`;

  return {
    id: `camara-votacao-${sourceId}`,
    source: 'camara',
    sourceId,
    proposalId: options.proposalIdentification,
    votedAt: normalizeDate(payload.data) ?? normalizeDate(payload.dataHoraRegistro),
    description,
    result: normalizeOfficialVoteResult(payload),
    individualVotes: options.individualVotes ?? []
  };
}

export function mapCamaraVotosToIndividualVotes(payloads: CamaraVotoPayload[]): IndividualVote[] {
  const votes: IndividualVote[] = [];

  for (const payload of payloads) {
    const vote = mapCamaraTipoVoto(payload.tipoVoto);
    const deputy = payload.deputado_;
    const parliamentarianName = normalizeString(deputy?.nome);

    if (!vote || !parliamentarianName) {
      continue;
    }

    const sourceId = normalizeString(deputy?.id);

    votes.push({
      parliamentarianId: sourceId ? `camara-${sourceId}` : undefined,
      parliamentarianName,
      party: normalizeString(deputy?.siglaPartido),
      state: normalizeString(deputy?.siglaUf),
      vote
    });
  }

  return votes;
}
