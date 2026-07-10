import type { IndividualVote, LegislativeProposal, Parliamentarian, RollCallVote } from '$lib/domain';
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
  SenadoRelatoriaPayload,
  SenadoSenadorPayload,
  SenadoVotacaoPayload,
  SenadoVotoPayload
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

  if (inProgressFlag === 'sim' || inProgressFlag === 's') {
    return 'Em tramitação';
  }

  if (inProgressFlag === 'nao' || inProgressFlag === 'n') {
    return 'Não tramita';
  }

  return undefined;
}

function normalizeVoteLabel(value: string | null | undefined) {
  return normalizeString(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR');
}

function mapSenadoTipoVoto(value: string | null | undefined): IndividualVote['vote'] | undefined {
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

function mapProcessoStatus(payload: SenadoProcessoPayload) {
  const currentSituation = normalizeString(payload.situacaoAtual);

  if (currentSituation) {
    return currentSituation;
  }

  return mapMateriaStatus({
    IdentificacaoMateria: {
      IndicadorTramitando: payload.tramitando
    }
  });
}

function mapProcessoSubject(payload: SenadoProcessoPayload) {
  return (
    normalizeString(payload.conteudo?.assuntoEspecifico) ??
    normalizeString(payload.conteudo?.assuntoGeral) ??
    normalizeString(payload.conteudo?.tipo) ??
    normalizeString(payload.tipoConteudo)
  );
}

function mapProcessoCurrentStage(payload: SenadoProcessoPayload) {
  const deliberation =
    normalizeString(payload.deliberacao?.tipoDeliberacao) ??
    normalizeString(payload.deliberacao?.destino);

  if (deliberation) {
    return deliberation;
  }

  const dispatches = toArray(payload.despachos).filter(
    (dispatch) => normalizeComparisonToken(dispatch.cancelado) !== 'sim'
  );
  const sortedDispatches = [...dispatches].sort((left, right) =>
    (normalizeDate(right.data) ?? '').localeCompare(normalizeDate(left.data) ?? '')
  );

  return normalizeString(sortedDispatches[0]?.tipoMotivacao);
}

function joinUniqueTexts(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const texts: string[] = [];

  for (const value of values) {
    const normalized = normalizeString(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLocaleLowerCase('pt-BR');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    texts.push(normalized);
  }

  return texts.length > 0 ? texts.join('; ') : undefined;
}

function mapProcessoAuthorship(payload: SenadoProcessoPayload) {
  return joinUniqueTexts([
    normalizeString(payload.documento?.resumoAutoria),
    normalizeString(payload.autoria),
    ...toArray(payload.autoriaIniciativa).map((author) => normalizeString(author.autor)),
    ...toArray(payload.documento?.autoria).map((author) => normalizeString(author.autor))
  ]);
}

function buildRelatoriaTitle(payload: SenadoRelatoriaPayload, sourceId: string) {
  const identification = normalizeString(payload.identificacaoProcesso);

  if (identification) {
    return identification;
  }

  return `Processo ${sourceId}`;
}

function mapRelatoriaStatus(payload: SenadoRelatoriaPayload) {
  return mapMateriaStatus({
    IdentificacaoMateria: {
      IndicadorTramitando: payload.tramitando
    }
  });
}

function requireVoteSourceId(payload: SenadoVotacaoPayload) {
  const sessionCode = normalizeString(payload.codigoSessao);
  const voteSequence = normalizeString(payload.sequencialVotacao);
  const sourceId =
    normalizeString(payload.codigoSessaoVotacao) ??
    (sessionCode && voteSequence ? `${sessionCode}-${voteSequence}` : undefined);

  if (!sourceId) {
    throw new SenadoMapperError('votacao', 'id');
  }

  return sourceId;
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
    origin: 'official',
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
    origin: 'official',
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
  const currentStage = mapProcessoCurrentStage(payload);
  const subject = mapProcessoSubject(payload);
  const authorship = mapProcessoAuthorship(payload);
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
    origin: 'official',
    source: 'senado',
    sourceId,
    title,
    type,
    number,
    year,
    status: mapProcessoStatus(payload),
    ...(currentStage ? { currentStage } : {}),
    ...(subject ? { subject } : {}),
    ...(authorship ? { authorship } : {}),
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

export function mapSenadoRelatoriaToLegislativeProposal(
  payload: SenadoRelatoriaPayload
): LegislativeProposal {
  const sourceId = requireSourceId('processo', payload.idProcesso);
  const codigoMateria = normalizeString(payload.codigoMateria);
  const parsedIdentification = parseProcessoIdentification(payload.identificacaoProcesso);
  const type = parsedIdentification.type ?? 'Processo';
  const officialUrl = codigoMateria
    ? `${senadoMateriaOfficialUrl}/${codigoMateria}`
    : `${senadoProcessoOfficialApiUrl}/${sourceId}`;

  return {
    id: `senado-processo-${sourceId}`,
    origin: 'official',
    source: 'senado',
    sourceId,
    title: buildRelatoriaTitle(payload, sourceId),
    type,
    number: parsedIdentification.number,
    year: parsedIdentification.year,
    status: mapRelatoriaStatus(payload),
    relationship: normalizeString(payload.descricaoTipoRelator) ?? 'Relatoria',
    subject: normalizeString(payload.nomeColegiado) ?? normalizeString(payload.siglaColegiado),
    authorship: normalizeString(payload.autoriaProcesso),
    presentedAt: normalizeDate(payload.dataApresentacaoProcesso),
    officialSummary: normalizeString(payload.ementaProcesso),
    officialUrl,
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

export function mapSenadoVotosToIndividualVotes(payloads: SenadoVotoPayload[]): IndividualVote[] {
  const votes: IndividualVote[] = [];

  for (const payload of payloads) {
    const vote = mapSenadoTipoVoto(payload.siglaVotoParlamentar);
    const parliamentarianName = normalizeString(payload.nomeParlamentar);

    if (!vote || !parliamentarianName) {
      continue;
    }

    const sourceId = normalizeString(payload.codigoParlamentar);

    votes.push({
      parliamentarianId: sourceId ? `senado-${sourceId}` : undefined,
      parliamentarianName,
      party: normalizeString(payload.siglaPartidoParlamentar),
      state: normalizeString(payload.siglaUFParlamentar),
      vote
    });
  }

  return votes;
}

export function mapSenadoVotacaoToRollCallVote(
  payload: SenadoVotacaoPayload,
  options: {
    proposalIdentification: string;
  }
): RollCallVote {
  const sourceId = requireVoteSourceId(payload);
  const description =
    normalizeString(payload.descricaoVotacao) ??
    normalizeString(payload.identificacao) ??
    `Votacao oficial ${sourceId}`;

  return {
    id: `senado-votacao-${sourceId}`,
    source: 'senado',
    sourceId,
    proposalId: normalizeString(payload.identificacao) ?? options.proposalIdentification,
    votedAt: normalizeDate(payload.dataSessao),
    description,
    result: normalizeString(payload.resultadoVotacao),
    individualVotes: mapSenadoVotosToIndividualVotes(toArray(payload.votos))
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
