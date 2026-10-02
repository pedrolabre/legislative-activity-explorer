import type { HttpCacheOption } from './httpMemoryCache';
import type { OfficialApiErrorKind } from './officialApiErrors';

export type CamaraApiErrorKind = OfficialApiErrorKind;

export interface CamaraApiLink {
  rel?: string | null;
  href?: string | null;
}

export interface CamaraApiSingleResponse<T> {
  dados?: T | null;
  links?: CamaraApiLink[];
}

export interface CamaraApiListResponse<T> {
  dados?: T[] | null;
  links?: CamaraApiLink[];
}

export interface CamaraApiPage<T> {
  data: T[];
  links: CamaraApiLink[];
}

export interface CamaraDeputadoPayload {
  id?: number | string | null;
  uri?: string | null;
  nome?: string | null;
  nomeCivil?: string | null;
  siglaPartido?: string | null;
  siglaUf?: string | null;
  idLegislatura?: number | string | null;
  urlFoto?: string | null;
  email?: string | null;
  ultimoStatus?: {
    id?: number | string | null;
    uri?: string | null;
    nome?: string | null;
    nomeEleitoral?: string | null;
    siglaPartido?: string | null;
    siglaUf?: string | null;
    idLegislatura?: number | string | null;
    urlFoto?: string | null;
    email?: string | null;
    situacao?: string | null;
    gabinete?: {
      email?: string | null;
    } | null;
  } | null;
}

export interface CamaraProposicaoPayload {
  id?: number | string | null;
  uri?: string | null;
  siglaTipo?: string | null;
  descricaoTipo?: string | null;
  numero?: number | string | null;
  ano?: number | string | null;
  ementa?: string | null;
  dataApresentacao?: string | null;
  urlInteiroTeor?: string | null;
  statusProposicao?: {
    dataHora?: string | null;
    descricaoSituacao?: string | null;
    descricaoTramitacao?: string | null;
    despacho?: string | null;
    regime?: string | null;
    url?: string | null;
  } | null;
}

export interface CamaraProposicaoTemaPayload {
  codTema?: number | string | null;
  tema?: string | null;
  relevancia?: number | string | null;
}

export interface CamaraVotacaoPayload {
  id?: number | string | null;
  uri?: string | null;
  data?: string | null;
  dataHoraRegistro?: string | null;
  siglaOrgao?: string | null;
  uriOrgao?: string | null;
  uriEvento?: string | null;
  proposicaoObjeto?: string | null;
  uriProposicaoObjeto?: string | null;
  descricao?: string | null;
  resultado?: string | null;
  aprovacao?: string | number | boolean | null;
}

export interface CamaraVotoPayload {
  tipoVoto?: string | null;
  dataRegistroVoto?: string | null;
  deputado_?: {
    id?: number | string | null;
    uri?: string | null;
    nome?: string | null;
    siglaPartido?: string | null;
    uriPartido?: string | null;
    siglaUf?: string | null;
    idLegislatura?: number | string | null;
    urlFoto?: string | null;
  } | null;
}

export interface CamaraRequestOptions {
  bypassCache?: boolean;
  signal?: AbortSignal;
}

export interface GetCamaraProposicoesByDeputadoAutorOptions extends CamaraRequestOptions {
  pagina?: number;
  itens?: number;
}

export interface GetCamaraDeputadosOptions extends CamaraRequestOptions {
  nome?: string;
  pagina?: number;
  itens?: number;
  ordem?: 'ASC' | 'DESC';
  ordenarPor?: string;
}

export interface GetCamaraProposicoesOptions extends CamaraRequestOptions {
  keywords?: string;
  siglaTipo?: string;
  numero?: string | number;
  ano?: string | number;
  pagina?: number;
  itens?: number;
  ordem?: 'ASC' | 'DESC';
  ordenarPor?: string;
}

export interface GetCamaraProposicaoVotacoesByIdOptions extends CamaraRequestOptions {
  ordem?: 'ASC' | 'DESC';
  ordenarPor?: 'id' | 'dataHoraRegistro';
}

export type CamaraFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface CamaraApiClientOptions {
  baseUrl?: string;
  fetch?: CamaraFetch;
  timeoutMs?: number;
  cache?: HttpCacheOption;
  cacheTtlMs?: number;
}
