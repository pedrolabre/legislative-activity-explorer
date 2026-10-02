import type { HttpCacheOption } from './httpMemoryCache';
import type { OfficialApiErrorKind } from './officialApiErrors';

export type SenadoApiErrorKind = OfficialApiErrorKind;
export type SenadoJsonMode = 'suffix' | 'accept-header';
export type SenadoFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface SenadoApiClientOptions {
  baseUrl?: string;
  fetch?: SenadoFetch;
  jsonMode?: SenadoJsonMode;
  timeoutMs?: number;
  cache?: HttpCacheOption;
  cacheTtlMs?: number;
}

export interface SenadoIdentificacaoParlamentarPayload {
  CodigoParlamentar?: number | string | null;
  CodigoPublicoNaLegAtual?: number | string | null;
  NomeParlamentar?: string | null;
  NomeCompletoParlamentar?: string | null;
  SiglaPartidoParlamentar?: string | null;
  UfParlamentar?: string | null;
  UrlFotoParlamentar?: string | null;
  UrlPaginaParlamentar?: string | null;
  EmailParlamentar?: string | null;
  MembroAtual?: string | null;
}

export interface SenadoLegislaturaMandatoPayload {
  NumeroLegislatura?: number | string | null;
  DataInicio?: string | null;
  DataFim?: string | null;
}

export interface SenadoExercicioMandatoPayload {
  CodigoExercicio?: number | string | null;
  DataInicio?: string | null;
  DataFim?: string | null;
  SiglaCausaAfastamento?: string | null;
  DescricaoCausaAfastamento?: string | null;
}

export interface SenadoExerciciosMandatoPayload {
  Exercicio?: SenadoExercicioMandatoPayload | SenadoExercicioMandatoPayload[] | null;
}

export interface SenadoMandatoPayload {
  CodigoMandato?: number | string | null;
  UfParlamentar?: string | null;
  PrimeiraLegislaturaDoMandato?: SenadoLegislaturaMandatoPayload | null;
  SegundaLegislaturaDoMandato?: SenadoLegislaturaMandatoPayload | null;
  DescricaoParticipacao?: string | null;
  Exercicios?: SenadoExerciciosMandatoPayload | null;
}

export interface SenadoSenadorPayload {
  IdentificacaoParlamentar?: SenadoIdentificacaoParlamentarPayload | null;
  Mandato?: SenadoMandatoPayload | null;
  Mandatos?: {
    Mandato?: SenadoMandatoPayload | SenadoMandatoPayload[] | null;
  } | null;
}

export interface SenadoIdentificacaoMateriaPayload {
  CodigoMateria?: number | string | null;
  SiglaSubtipoMateria?: string | null;
  DescricaoSubtipoMateria?: string | null;
  NumeroMateria?: number | string | null;
  AnoMateria?: number | string | null;
  DescricaoIdentificacaoMateria?: string | null;
  IndicadorTramitando?: string | null;
  IdentificacaoProcesso?: number | string | null;
}

export interface SenadoDadosBasicosMateriaPayload {
  EmentaMateria?: string | null;
  DataApresentacao?: string | null;
  NaturezaMateria?: {
    DescricaoNatureza?: string | null;
  } | null;
}

export interface SenadoMateriaPayload {
  IdentificacaoMateria?: SenadoIdentificacaoMateriaPayload | null;
  DadosBasicosMateria?: SenadoDadosBasicosMateriaPayload | null;
  SituacaoAtual?: {
    Situacao?: {
      DescricaoSituacao?: string | null;
    } | null;
  } | null;
  DecisaoEDestino?: {
    Decisao?: {
      Descricao?: string | null;
    } | null;
  } | null;
}

export interface SenadoProcessoConteudoPayload {
  id?: number | string | null;
  idTipo?: number | string | null;
  siglaTipo?: string | null;
  tipo?: string | null;
  ementa?: string | null;
  explicacaoEmenta?: string | null;
  assuntoEspecifico?: string | null;
  assuntoGeral?: string | null;
}

export interface SenadoProcessoAutorPayload {
  autor?: string | null;
  siglaTipo?: string | null;
  descricaoTipo?: string | null;
  codigoParlamentar?: number | string | null;
  uf?: string | null;
  siglaPartido?: string | null;
  siglaCargo?: string | null;
  cargo?: string | null;
}

export interface SenadoProcessoDocumentoPayload {
  id?: number | string | null;
  siglaTipo?: string | null;
  tipo?: string | null;
  dataApresentacao?: string | null;
  url?: string | null;
  resumoAutoria?: string | null;
  autoria?: SenadoProcessoAutorPayload | SenadoProcessoAutorPayload[] | null;
}

export interface SenadoProcessoDeliberacaoPayload {
  data?: string | null;
  siglaTipo?: string | null;
  tipoDeliberacao?: string | null;
  destino?: string | null;
}

export interface SenadoProcessoDespachoPayload {
  id?: number | string | null;
  data?: string | null;
  siglaTipoMotivacao?: string | null;
  tipoMotivacao?: string | null;
  cancelado?: string | null;
}

export interface SenadoProcessoTramitacaoPayload {
  descricaoSituacao?: string | null;
  descricaoSituacaoProcesso?: string | null;
  descricaoTramitacao?: string | null;
}

export interface SenadoProcessoPayload {
  id?: number | string | null;
  codigoMateria?: number | string | null;
  identificacao?: string | null;
  sigla?: string | null;
  descricaoSigla?: string | null;
  numero?: number | string | null;
  ano?: number | string | null;
  casaIdentificadora?: string | null;
  enteIdentificador?: string | null;
  siglaEnteIdentificador?: string | null;
  tipoConteudo?: string | null;
  tipoDocumento?: string | null;
  objetivo?: string | null;
  ementa?: string | null;
  explicacaoEmenta?: string | null;
  autoria?: string | null;
  autoriaIniciativa?: SenadoProcessoAutorPayload | SenadoProcessoAutorPayload[] | null;
  conteudo?: SenadoProcessoConteudoPayload | null;
  documento?: SenadoProcessoDocumentoPayload | null;
  tramitando?: string | null;
  situacaoAtual?: string | null;
  siglaSituacaoAtual?: string | null;
  dataApresentacao?: string | null;
  dataDeliberacao?: string | null;
  dataInicioEfetivo?: string | null;
  dataSituacaoAtual?: string | null;
  dataUltimaAtualizacao?: string | null;
  dthUltimaAtualizacao?: string | null;
  ultimaInformacaoAtualizada?: string | null;
  urlDocumento?: string | null;
  deliberacao?: SenadoProcessoDeliberacaoPayload | null;
  despachos?: SenadoProcessoDespachoPayload | SenadoProcessoDespachoPayload[] | null;
}

export interface SenadoRelatoriaPayload {
  id?: number | string | null;
  idProcesso?: number | string | null;
  codigoMateria?: number | string | null;
  identificacaoProcesso?: string | null;
  ementaProcesso?: string | null;
  autoriaProcesso?: string | null;
  tramitando?: string | null;
  dataApresentacaoProcesso?: string | null;
  dataDesignacao?: string | null;
  dataDestituicao?: string | null;
  descricaoTipoEncerramento?: string | null;
  descricaoTipoRelator?: string | null;
  nomeColegiado?: string | null;
  siglaColegiado?: string | null;
}

export interface SenadoVotoPayload {
  codigoParlamentar?: number | string | null;
  nomeParlamentar?: string | null;
  siglaPartidoParlamentar?: string | null;
  siglaUFParlamentar?: string | null;
  siglaVotoParlamentar?: string | null;
  descricaoVotoParlamentar?: string | null;
}

export interface SenadoVotacaoPayload {
  codigoSessao?: number | string | null;
  codigoSessaoVotacao?: number | string | null;
  sequencialVotacao?: number | string | null;
  dataSessao?: string | null;
  idProcesso?: number | string | null;
  codigoMateria?: number | string | null;
  identificacao?: string | null;
  sigla?: string | null;
  numero?: number | string | null;
  ano?: number | string | null;
  descricaoVotacao?: string | null;
  resultadoVotacao?: string | null;
  totalVotosSim?: number | string | null;
  totalVotosNao?: number | string | null;
  totalVotosAbstencao?: number | string | null;
  votacaoSecreta?: string | null;
  informeLegislativo?: {
    texto?: string | null;
    nomeColegiado?: string | null;
    siglaColegiado?: string | null;
  } | null;
  votos?: SenadoVotoPayload | SenadoVotoPayload[] | null;
}

export interface SenadoRequestOptions {
  bypassCache?: boolean;
  signal?: AbortSignal;
}

export interface GetSenadoMateriasPesquisaOptions extends SenadoRequestOptions {
  termo: string;
}

export interface GetSenadoProcessosOptions extends SenadoRequestOptions {
  termo?: string;
  sigla?: string;
  numero?: string;
  ano?: number;
  codigoMateria?: string | number;
  idProcesso?: string | number;
  codigoParlamentarAutor?: string | number;
  tramitando?: 'S' | 'N';
  numdias?: number;
}

export interface GetSenadoRelatoriasOptions extends SenadoRequestOptions {
  idProcesso?: string | number;
  codigoMateria?: string | number;
  codigoParlamentar?: string | number;
  dataInicio?: string;
  dataFim?: string;
}

export interface GetSenadoVotacoesOptions extends SenadoRequestOptions {
  idProcesso?: string | number;
  codigoMateria?: string | number;
  sigla?: string;
  numero?: string;
  ano?: number;
  codigoParlamentar?: string | number;
}
