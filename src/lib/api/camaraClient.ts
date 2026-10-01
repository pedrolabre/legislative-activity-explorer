import {
  buildHttpCacheKey,
  resolveHttpMemoryCache,
  type HttpCacheOption,
  type LegislativeHttpMemoryCache
} from './httpMemoryCache';
import { OFFICIAL_API_DEFAULT_TIMEOUT_MS } from './officialApiConfig';
import { OfficialApiClientError, type OfficialApiErrorKind } from './officialApiErrors';

export const CAMARA_API_BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2';
export const CAMARA_API_DEFAULT_TIMEOUT_MS = OFFICIAL_API_DEFAULT_TIMEOUT_MS;

export type CamaraApiErrorKind = OfficialApiErrorKind;

export class CamaraApiClientError extends OfficialApiClientError {
  constructor(
    message: string,
    options: {
      kind: CamaraApiErrorKind;
      status?: number;
      url?: string;
      cause?: unknown;
    }
  ) {
    super(message, {
      ...options,
      source: 'camara',
      name: 'CamaraApiClientError'
    });
  }
}

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

function getDefaultFetch(): CamaraFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new CamaraApiClientError('Fetch global indisponivel para consultar a Camara.', {
      kind: 'network'
    });
  }

  return globalThis.fetch.bind(globalThis);
}

function isAbortError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
    return true;
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isResponseWithData(value: unknown): value is { dados: unknown } {
  return isRecord(value) && 'dados' in value;
}

export class CamaraApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: CamaraFetch;
  private readonly timeoutMs: number;
  private readonly cacheInstance: LegislativeHttpMemoryCache | null;
  private readonly cacheTtlMs?: number;

  constructor(options: CamaraApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? CAMARA_API_BASE_URL;
    this.fetcher = options.fetch ?? getDefaultFetch();
    this.timeoutMs = options.timeoutMs ?? CAMARA_API_DEFAULT_TIMEOUT_MS;
    this.cacheTtlMs = options.cacheTtlMs;
    this.cacheInstance = resolveHttpMemoryCache(options.cache, {
      defaultTtlMs: options.cacheTtlMs
    });
  }

  get cache(): LegislativeHttpMemoryCache | null {
    return this.cacheInstance;
  }

  clearCache(): void {
    this.cacheInstance?.clear();
  }

  async getDeputadoById(
    id: number | string,
    options?: CamaraRequestOptions
  ): Promise<CamaraDeputadoPayload> {
    return this.requestSingleData<CamaraDeputadoPayload>(`deputados/${id}`, undefined, options);
  }

  async getDeputados(options: GetCamaraDeputadosOptions = {}): Promise<CamaraDeputadoPayload[]> {
    const page = await this.getDeputadosPage(options);

    return page.data;
  }

  async getDeputadosPage(
    options: GetCamaraDeputadosOptions = {}
  ): Promise<CamaraApiPage<CamaraDeputadoPayload>> {
    return this.requestListPage<CamaraDeputadoPayload>(
      'deputados',
      {
        nome: options.nome,
        pagina: options.pagina,
        itens: options.itens,
        ordem: options.ordem,
        ordenarPor: options.ordenarPor
      },
      options
    );
  }

  async getProposicaoById(
    id: number | string,
    options?: CamaraRequestOptions
  ): Promise<CamaraProposicaoPayload> {
    return this.requestSingleData<CamaraProposicaoPayload>(`proposicoes/${id}`, undefined, options);
  }

  async getProposicaoTemasById(
    id: number | string,
    options?: CamaraRequestOptions
  ): Promise<CamaraProposicaoTemaPayload[]> {
    const page = await this.getProposicaoTemasByIdPage(id, options);

    return page.data;
  }

  async getProposicaoTemasByIdPage(
    id: number | string,
    options?: CamaraRequestOptions
  ): Promise<CamaraApiPage<CamaraProposicaoTemaPayload>> {
    return this.requestListPage<CamaraProposicaoTemaPayload>(
      `proposicoes/${id}/temas`,
      undefined,
      options
    );
  }

  async getProposicaoVotacoesById(
    id: number | string,
    options: GetCamaraProposicaoVotacoesByIdOptions = {}
  ): Promise<CamaraVotacaoPayload[]> {
    const page = await this.getProposicaoVotacoesByIdPage(id, options);

    return page.data;
  }

  async getProposicaoVotacoesByIdPage(
    id: number | string,
    options: GetCamaraProposicaoVotacoesByIdOptions = {}
  ): Promise<CamaraApiPage<CamaraVotacaoPayload>> {
    return this.requestListPage<CamaraVotacaoPayload>(
      `proposicoes/${id}/votacoes`,
      {
        ordem: options.ordem,
        ordenarPor: options.ordenarPor
      },
      options
    );
  }

  async getVotacaoById(
    id: number | string,
    options?: CamaraRequestOptions
  ): Promise<CamaraVotacaoPayload> {
    return this.requestSingleData<CamaraVotacaoPayload>(`votacoes/${id}`, undefined, options);
  }

  async getVotacaoVotosById(
    id: number | string,
    options?: CamaraRequestOptions
  ): Promise<CamaraVotoPayload[]> {
    const page = await this.getVotacaoVotosByIdPage(id, options);

    return page.data;
  }

  async getVotacaoVotosByIdPage(
    id: number | string,
    options?: CamaraRequestOptions
  ): Promise<CamaraApiPage<CamaraVotoPayload>> {
    return this.requestListPage<CamaraVotoPayload>(`votacoes/${id}/votos`, undefined, options);
  }

  async getProposicoes(
    options: GetCamaraProposicoesOptions = {}
  ): Promise<CamaraProposicaoPayload[]> {
    const page = await this.getProposicoesPage(options);

    return page.data;
  }

  async getProposicoesPage(
    options: GetCamaraProposicoesOptions = {}
  ): Promise<CamaraApiPage<CamaraProposicaoPayload>> {
    return this.requestListPage<CamaraProposicaoPayload>(
      'proposicoes',
      {
        keywords: options.keywords,
        siglaTipo: options.siglaTipo,
        numero: options.numero,
        ano: options.ano,
        pagina: options.pagina,
        itens: options.itens,
        ordem: options.ordem,
        ordenarPor: options.ordenarPor
      },
      options
    );
  }

  async getProposicoesByDeputadoAutor(
    deputadoId: number | string,
    options: GetCamaraProposicoesByDeputadoAutorOptions = {}
  ): Promise<CamaraProposicaoPayload[]> {
    const page = await this.getProposicoesByDeputadoAutorPage(deputadoId, options);

    return page.data;
  }

  async getProposicoesByDeputadoAutorPage(
    deputadoId: number | string,
    options: GetCamaraProposicoesByDeputadoAutorOptions = {}
  ): Promise<CamaraApiPage<CamaraProposicaoPayload>> {
    return this.requestListPage<CamaraProposicaoPayload>(
      'proposicoes',
      {
        idDeputadoAutor: String(deputadoId),
        pagina: options.pagina,
        itens: options.itens
      },
      options
    );
  }

  private buildUrl(path: string, params: Record<string, string | number | undefined> = {}) {
    const normalizedBaseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    const normalizedPath = path.replace(/^\/+/, '');
    const url = new URL(normalizedPath, normalizedBaseUrl);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private async requestJson<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    requestOptions: CamaraRequestOptions = {}
  ): Promise<T> {
    if (requestOptions.signal?.aborted) {
      throw (
        requestOptions.signal.reason ??
        new DOMException('A consulta foi cancelada.', 'AbortError')
      );
    }

    const url = this.buildUrl(path, params);
    const cacheKey = buildHttpCacheKey(url, 'GET');

    if (this.cacheInstance && !requestOptions.bypassCache) {
      const cached = this.cacheInstance.get<T>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    let response: Response;

    try {
      response = await this.fetchWithTimeout(url, {
        headers: {
          Accept: 'application/json'
        },
        signal: requestOptions.signal
      });
    } catch (cause) {
      if (cause instanceof CamaraApiClientError) {
        throw cause;
      }

      if (requestOptions.signal?.aborted || isAbortError(cause)) {
        throw cause;
      }

      throw new CamaraApiClientError('Nao foi possivel consultar a API da Camara.', {
        kind: 'network',
        url,
        cause
      });
    }

    if (!response.ok) {
      throw new CamaraApiClientError('A API da Camara retornou uma falha HTTP.', {
        kind: 'http',
        status: response.status,
        url
      });
    }

    let data: T;

    try {
      data = (await response.json()) as T;
    } catch (cause) {
      if (requestOptions.signal?.aborted || isAbortError(cause)) {
        throw cause;
      }

      throw new CamaraApiClientError('A API da Camara retornou JSON invalido.', {
        kind: 'invalid-payload',
        url,
        cause
      });
    }

    if (this.cacheInstance && !requestOptions.bypassCache) {
      this.cacheInstance.set(cacheKey, data, this.cacheTtlMs);
    }

    return data;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const externalSignal = init.signal;

    if (externalSignal?.aborted) {
      throw (
        externalSignal.reason ??
        new DOMException('A consulta foi cancelada.', 'AbortError')
      );
    }

    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      return this.fetcher(url, init);
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let isTimedOut = false;

    const onExternalAbort = () => {
      controller.abort(externalSignal?.reason);
    };

    if (externalSignal) {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          isTimedOut = true;
          controller.abort();
          reject(
            new CamaraApiClientError('A consulta a API da Camara excedeu o tempo limite.', {
              kind: 'timeout',
              url
            })
          );
        }, this.timeoutMs);
      });

      return await Promise.race([
        this.fetcher(url, {
          ...init,
          signal: controller.signal
        }),
        timeoutPromise
      ]);
    } catch (cause) {
      if (cause instanceof CamaraApiClientError) {
        throw cause;
      }

      if (externalSignal?.aborted) {
        throw cause;
      }

      if (isTimedOut || controller.signal.aborted) {
        throw new CamaraApiClientError('A consulta a API da Camara excedeu o tempo limite.', {
          kind: 'timeout',
          url,
          cause
        });
      }

      throw cause;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  private async requestSingleData<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    requestOptions?: CamaraRequestOptions
  ): Promise<T> {
    const envelope = await this.requestJson<CamaraApiSingleResponse<T>>(
      path,
      params,
      requestOptions
    );

    if (!isResponseWithData(envelope) || envelope.dados === null || envelope.dados === undefined) {
      throw new CamaraApiClientError('A resposta da Camara nao contem dados validos.', {
        kind: 'invalid-payload'
      });
    }

    return envelope.dados as T;
  }

  private async requestListPage<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    requestOptions?: CamaraRequestOptions
  ): Promise<CamaraApiPage<T>> {
    const envelope = await this.requestJson<CamaraApiListResponse<T>>(
      path,
      params,
      requestOptions
    );

    if (!isResponseWithData(envelope) || !Array.isArray(envelope.dados)) {
      throw new CamaraApiClientError('A resposta da Camara nao contem lista de dados valida.', {
        kind: 'invalid-payload'
      });
    }

    return {
      data: envelope.dados,
      links: Array.isArray(envelope.links) ? envelope.links : []
    };
  }
}
