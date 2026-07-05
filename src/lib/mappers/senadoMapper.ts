import type { LegislativeProposal, Parliamentarian } from '$lib/domain';
import {
  normalizeComparisonToken,
  normalizeDate,
  normalizeNumber,
  normalizeString
} from '$lib/utils/normalization';
import type {
  SenadoExercicioMandatoPayload,
  SenadoMandatoPayload,
  SenadoMateriaPayload,
  SenadoProcessoPayload,
  SenadoSenadorPayload
} from '$lib/api/senadoClient';
import { OfficialMapperError } from './officialMapperError';

const senadoSenadorOfficialUrl = 'https://www25.senado.leg.br/web/senadores/senador/-/perfil';
const senadoMateriaOfficialUrl = 'https://www25.senado.leg.br/web/atividade/materias/-/materia';
const senadoProcessoOfficialApiUrl = 'https://legis.senado.leg.br/dadosabertos/processo';
const senadoMandateTermLabel = 'Mandato';
const senadoPublisher = 'Senado Federal';

export class SenadoMapperError extends OfficialMapperError {
  constructor(entity: string, field: string) {
    super({
      source: 'senado',
      sourceLabel: 'do Senado',
      entity,
      field,
      name: 'SenadoMapperError'
    });
  }
}

function normalizeMatterNumber(value: string | number | null | undefined): string | undefined {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  if (/^\d+$/.test(normalized)) {
    return String(Number(normalized));
  }

  return normalized;
}

function requireSourceId(
  entity: 'senador' | 'materia' | 'processo',
  value: string | number | null | undefined
) {
  const sourceId = normalizeString(value);

  if (!sourceId) {
    throw new SenadoMapperError(entity, 'id');
  }

  return sourceId;
}

function parseProcessoIdentification(value: string | null | undefined) {
  const normalized = normalizeString(value);
  const match = normalized?.match(/^([A-Z]{2,5})\s+(\d+)(?:\/(\d{4}))?/i);

  if (!match) {
    return {
      type: undefined,
      number: undefined,
      year: undefined
    };
  }

  return {
    type: match[1].toLocaleUpperCase('pt-BR'),
    number: normalizeMatterNumber(match[2]),
    year: normalizeNumber(match[3])
  };
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getMandateExercises(mandate: SenadoMandatoPayload | undefined) {
  return toArray<SenadoExercicioMandatoPayload>(mandate?.Exercicios?.Exercicio);
}

function hasOpenExercise(mandate: SenadoMandatoPayload | undefined) {
  return getMandateExercises(mandate).some(
    (exercise) => normalizeDate(exercise.DataInicio) && !normalizeDate(exercise.DataFim)
  );
}

function getMandateStartDate(mandate: SenadoMandatoPayload | undefined) {
  return (
    normalizeDate(mandate?.PrimeiraLegislaturaDoMandato?.DataInicio) ??
    normalizeDate(mandate?.SegundaLegislaturaDoMandato?.DataInicio)
  );
}

function getMandateEndDate(mandate: SenadoMandatoPayload | undefined) {
  return (
    normalizeDate(mandate?.SegundaLegislaturaDoMandato?.DataFim) ??
    normalizeDate(mandate?.PrimeiraLegislaturaDoMandato?.DataFim)
  );
}

function getMandateSortDate(mandate: SenadoMandatoPayload) {
  return getMandateEndDate(mandate) ?? getMandateStartDate(mandate) ?? '';
}

function selectBestMandate(mandates: SenadoMandatoPayload[]) {
  const openExerciseMandate = mandates.find(hasOpenExercise);

  if (openExerciseMandate) {
    return openExerciseMandate;
  }

  return [...mandates].sort((left, right) =>
    getMandateSortDate(right).localeCompare(getMandateSortDate(left))
  )[0];
}

function getSenatorMandates(
  payload: SenadoSenadorPayload,
  extraMandates: SenadoMandatoPayload[] = []
) {
  const mandates: SenadoMandatoPayload[] = [];

  mandates.push(...toArray(payload.Mandato));
  mandates.push(...toArray(payload.Mandatos?.Mandato));
  mandates.push(...extraMandates);

  return mandates;
}

function mapSenatorMandateTerm(mandate: SenadoMandatoPayload | undefined) {
  const startDate = getMandateStartDate(mandate);
  const endDate = getMandateEndDate(mandate);

  if (!startDate || !endDate) {
    return undefined;
  }

  return `${startDate} a ${endDate}`;
}

function mapSenadorStatus(payload: SenadoSenadorPayload, mandate?: SenadoMandatoPayload) {
  const identification = payload.IdentificacaoParlamentar;
  const currentFlag = normalizeComparisonToken(identification?.MembroAtual);
  const participation = normalizeString(mandate?.DescricaoParticipacao);
  let status: string | undefined;

  if (currentFlag === 'sim') {
    status = 'Exercício';
  } else if (currentFlag === 'nao') {
    status = 'Fim de Mandato';
  }

  if (status && participation) {
    return `${status} - ${participation}`;
  }

  return status;
}

function buildMateriaTitle(payload: SenadoMateriaPayload, sourceId: string) {
  const identification = payload.IdentificacaoMateria;
  const description = normalizeString(identification?.DescricaoIdentificacaoMateria);

  if (description) {
    return description;
  }

  const type =
    normalizeString(identification?.SiglaSubtipoMateria) ??
    normalizeString(identification?.DescricaoSubtipoMateria);
  const number = normalizeMatterNumber(identification?.NumeroMateria);
  const year = normalizeNumber(identification?.AnoMateria);

  if (type && number && year) {
    return `${type} ${number}/${year}`;
  }

  if (type && number) {
    return `${type} ${number}`;
  }

  if (type) {
    return type;
  }

  return `Matéria ${sourceId}`;
}

function mapMateriaStatus(payload: SenadoMateriaPayload) {
  const identification = payload.IdentificacaoMateria;
  const currentSituation = normalizeString(payload.SituacaoAtual?.Situacao?.DescricaoSituacao);
  const decision = normalizeString(payload.DecisaoEDestino?.Decisao?.Descricao);
  const inProgressFlag = normalizeComparisonToken(identification?.IndicadorTramitando);

  if (currentSituation) {
    return currentSituation;
  }

  if (decision) {
    return decision;
  }

  if (inProgressFlag === 'sim') {
    return 'Em tramitação';
  }

  if (inProgressFlag === 'nao') {
    return 'Não tramita';
  }

  return undefined;
}

export function mapSenadoSenadorToParliamentarian(
  payload: SenadoSenadorPayload,
  options: {
    mandates?: SenadoMandatoPayload[];
  } = {}
): Parliamentarian {
  const identification = payload.IdentificacaoParlamentar;
  const sourceId = requireSourceId('senador', identification?.CodigoParlamentar);
  const mandate = selectBestMandate(getSenatorMandates(payload, options.mandates));
  const term = mapSenatorMandateTerm(mandate);
  const name =
    normalizeString(identification?.NomeParlamentar) ??
    normalizeString(identification?.NomeCompletoParlamentar) ??
    `Senador ${sourceId}`;

  return {
    id: `senado-${sourceId}`,
    source: 'senado',
    sourceId,
    name,
    fullName: normalizeString(identification?.NomeCompletoParlamentar),
    office: 'Senador',
    party: normalizeString(identification?.SiglaPartidoParlamentar),
    state: normalizeString(identification?.UfParlamentar) ?? normalizeString(mandate?.UfParlamentar),
    status: mapSenadorStatus(payload, mandate),
    term,
    termLabel: term ? senadoMandateTermLabel : undefined,
    photoUrl: normalizeString(identification?.UrlFotoParlamentar),
    email: normalizeString(identification?.EmailParlamentar),
    officialUrl:
      normalizeString(identification?.UrlPaginaParlamentar) ??
      `${senadoSenadorOfficialUrl}/${sourceId}`
  };
}

export function mapSenadoMateriaToLegislativeProposal(
  payload: SenadoMateriaPayload
): LegislativeProposal {
  const identification = payload.IdentificacaoMateria;
  const sourceId = requireSourceId('materia', identification?.CodigoMateria);
  const title = buildMateriaTitle(payload, sourceId);
  const officialUrl = `${senadoMateriaOfficialUrl}/${sourceId}`;

  return {
    id: `senado-materia-${sourceId}`,
    source: 'senado',
    sourceId,
    title,
    type:
      normalizeString(identification?.SiglaSubtipoMateria) ??
      normalizeString(identification?.DescricaoSubtipoMateria) ??
      'Matéria',
    number: normalizeMatterNumber(identification?.NumeroMateria),
    year: normalizeNumber(identification?.AnoMateria),
    status: mapMateriaStatus(payload),
    subject: normalizeString(payload.DadosBasicosMateria?.NaturezaMateria?.DescricaoNatureza),
    presentedAt: normalizeDate(payload.DadosBasicosMateria?.DataApresentacao),
    officialSummary: normalizeString(payload.DadosBasicosMateria?.EmentaMateria),
    officialUrl,
    references: [
      {
        id: `senado-materia-${sourceId}-fonte-oficial`,
        type: 'official',
        title: 'Página oficial da matéria',
        publisher: senadoPublisher,
        url: officialUrl
      }
    ]
  };
}

export function mapSenadoProcessoToLegislativeProposal(
  payload: SenadoProcessoPayload
): LegislativeProposal {
  const sourceId = requireSourceId('processo', payload.id);
  const codigoMateria = normalizeString(payload.codigoMateria);
  const parsedIdentification = parseProcessoIdentification(payload.identificacao);
  const type =
    normalizeString(payload.sigla) ??
    parsedIdentification.type ??
    normalizeString(payload.descricaoSigla) ??
    normalizeString(payload.tipoDocumento) ??
    'Processo';
  const number = normalizeMatterNumber(payload.numero) ?? parsedIdentification.number;
  const year = normalizeNumber(payload.ano) ?? parsedIdentification.year;
  const title =
    normalizeString(payload.identificacao) ??
    (type && number && year ? `${type} ${number}/${year}` : undefined) ??
    (type && number ? `${type} ${number}` : undefined) ??
    `Processo ${sourceId}`;
  const officialUrl = codigoMateria
    ? `${senadoMateriaOfficialUrl}/${codigoMateria}`
    : `${senadoProcessoOfficialApiUrl}/${sourceId}`;

  return {
    id: `senado-processo-${sourceId}`,
    source: 'senado',
    sourceId,
    title,
    type,
    number,
    year,
    status:
      normalizeString(payload.situacaoAtual) ??
      mapMateriaStatus({
        IdentificacaoMateria: {
          IndicadorTramitando: payload.tramitando
        }
      }),
    subject: normalizeString(payload.conteudo?.tipo) ?? normalizeString(payload.tipoConteudo),
    presentedAt:
      normalizeDate(payload.dataApresentacao) ??
      normalizeDate(payload.documento?.dataApresentacao) ??
      normalizeDate(payload.dataInicioEfetivo),
    officialSummary: normalizeString(payload.ementa) ?? normalizeString(payload.conteudo?.ementa),
    officialUrl,
    officialFullTextUrl: normalizeString(payload.urlDocumento) ?? normalizeString(payload.documento?.url),
    references: [
      {
        id: `senado-processo-${sourceId}-fonte-oficial`,
        type: 'official',
        title: 'Fonte oficial do processo legislativo',
        publisher: senadoPublisher,
        url: officialUrl
      }
    ]
  };
}

export function mapSenadoMateriasToLegislativeProposals(
  payloads: SenadoMateriaPayload[]
): LegislativeProposal[] {
  return payloads.map(mapSenadoMateriaToLegislativeProposal);
}

export function mapSenadoProcessosToLegislativeProposals(
  payloads: SenadoProcessoPayload[]
): LegislativeProposal[] {
  return payloads.map(mapSenadoProcessoToLegislativeProposal);
}
