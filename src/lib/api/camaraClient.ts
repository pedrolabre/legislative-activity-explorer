export const CAMARA_API_BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2';
export const CAMARA_API_DEFAULT_TIMEOUT_MS = 10000;

export type CamaraApiErrorKind = 'http' | 'network' | 'invalid-payload' | 'timeout';

export class CamaraApiClientError extends Error {
  kind: CamaraApiErrorKind;
  status?: number;
  url?: string;

  constructor(
    message: string,
    options: {
      kind: CamaraApiErrorKind;
      status?: number;
      url?: string;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = 'CamaraApiClientError';
    this.kind = options.kind;
    this.status = options.status;
    this.url = options.url;
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
  statusProposicao?: {
    descricaoSituacao?: string | null;
    regime?: string | null;
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

export interface GetCamaraProposicoesByDeputadoAutorOptions {
  pagina?: number;
  itens?: number;
}

export interface GetCamaraProposicaoVotacoesOptions {
  pagina?: number;
  itens?: number;
}

export interface GetCamaraDeputadosOptions {
  nome?: string;
  pagina?: number;
  itens?: number;
  ordem?: 'ASC' | 'DESC';
  ordenarPor?: string;
}

export interface GetCamaraProposicoesOptions {
  keywords?: string;
  siglaTipo?: string;
  numero?: string | number;
  ano?: string | number;
  pagina?: number;
  itens?: number;
  ordem?: 'ASC' | 'DESC';
  ordenarPor?: string;
}

export type CamaraFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface CamaraApiClientOptions {
  baseUrl?: string;
  fetch?: CamaraFetch;
  timeoutMs?: number;
}

function getDefaultFetch(): CamaraFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new CamaraApiClientError('Fetch global indisponivel para consultar a Camara.', {
      kind: 'network'
    });
  }

  return globalThis.fetch.bind(globalThis);
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

  constructor(options: CamaraApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? CAMARA_API_BASE_URL;
    this.fetcher = options.fetch ?? getDefaultFetch();
    this.timeoutMs = options.timeoutMs ?? CAMARA_API_DEFAULT_TIMEOUT_MS;
  }

  async getDeputadoById(id: number | string): Promise<CamaraDeputadoPayload> {
    return this.requestSingleData<CamaraDeputadoPayload>(`deputados/${id}`);
  }

  async getDeputados(options: GetCamaraDeputadosOptions = {}): Promise<CamaraDeputadoPayload[]> {
    const page = await this.getDeputadosPage(options);

    return page.data;
  }

  async getDeputadosPage(
    options: GetCamaraDeputadosOptions = {}
  ): Promise<CamaraApiPage<CamaraDeputadoPayload>> {
    return this.requestListPage<CamaraDeputadoPayload>('deputados', {
      nome: options.nome,
      pagina: options.pagina,
      itens: options.itens,
      ordem: options.ordem,
      ordenarPor: options.ordenarPor
    });
  }

  async getProposicaoById(id: number | string): Promise<CamaraProposicaoPayload> {
    return this.requestSingleData<CamaraProposicaoPayload>(`proposicoes/${id}`);
  }

  async getProposicaoTemasById(id: number | string): Promise<CamaraProposicaoTemaPayload[]> {
    const page = await this.getProposicaoTemasByIdPage(id);

    return page.data;
  }

  async getProposicaoTemasByIdPage(
    id: number | string
  ): Promise<CamaraApiPage<CamaraProposicaoTemaPayload>> {
    return this.requestListPage<CamaraProposicaoTemaPayload>(`proposicoes/${id}/temas`);
  }

  async getProposicaoVotacoesById(
    id: number | string,
    options: GetCamaraProposicaoVotacoesOptions = {}
  ): Promise<CamaraVotacaoPayload[]> {
    const page = await this.getProposicaoVotacoesByIdPage(id, options);

    return page.data;
  }

  async getProposicaoVotacoesByIdPage(
    id: number | string,
    options: GetCamaraProposicaoVotacoesOptions = {}
  ): Promise<CamaraApiPage<CamaraVotacaoPayload>> {
    return this.requestListPage<CamaraVotacaoPayload>(`proposicoes/${id}/votacoes`, {
      pagina: options.pagina,
      itens: options.itens
    });
  }

  async getVotacaoById(id: number | string): Promise<CamaraVotacaoPayload> {
    return this.requestSingleData<CamaraVotacaoPayload>(`votacoes/${id}`);
  }

  async getVotacaoVotosById(id: number | string): Promise<CamaraVotoPayload[]> {
    const page = await this.getVotacaoVotosByIdPage(id);

    return page.data;
  }

  async getVotacaoVotosByIdPage(id: number | string): Promise<CamaraApiPage<CamaraVotoPayload>> {
    return this.requestListPage<CamaraVotoPayload>(`votacoes/${id}/votos`);
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
    return this.requestListPage<CamaraProposicaoPayload>('proposicoes', {
      keywords: options.keywords,
      siglaTipo: options.siglaTipo,
      numero: options.numero,
      ano: options.ano,
      pagina: options.pagina,
      itens: options.itens,
      ordem: options.ordem,
      ordenarPor: options.ordenarPor
    });
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
    return this.requestListPage<CamaraProposicaoPayload>('proposicoes', {
      idDeputadoAutor: String(deputadoId),
      pagina: options.pagina,
      itens: options.itens
    });
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
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    let response: Response;

    try {
      response = await this.fetchWithTimeout(url, {
        headers: {
          Accept: 'application/json'
        }
      });
    } catch (cause) {
      if (cause instanceof CamaraApiClientError) {
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

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new CamaraApiClientError('A API da Camara retornou JSON invalido.', {
        kind: 'invalid-payload',
        url,
        cause
      });
    }
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      return this.fetcher(url, init);
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
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

      if (controller.signal.aborted) {
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
    }
  }

  private async requestSingleData<T>(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const envelope = await this.requestJson<CamaraApiSingleResponse<T>>(path, params);

    if (!isResponseWithData(envelope) || envelope.dados === null || envelope.dados === undefined) {
      throw new CamaraApiClientError('A resposta da Camara nao contem dados validos.', {
        kind: 'invalid-payload'
      });
    }

    return envelope.dados as T;
  }

  private async requestListPage<T>(
    path: string,
    params?: Record<string, string | number | undefined>
  ): Promise<CamaraApiPage<T>> {
    const envelope = await this.requestJson<CamaraApiListResponse<T>>(path, params);

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
