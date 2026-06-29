export const SENADO_API_BASE_URL = 'https://legis.senado.leg.br/dadosabertos';
export const SENADO_API_DEFAULT_TIMEOUT_MS = 10000;

export type SenadoApiErrorKind = 'http' | 'network' | 'invalid-payload' | 'timeout';

export class SenadoApiClientError extends Error {
  kind: SenadoApiErrorKind;
  status?: number;
  url?: string;

  constructor(
    message: string,
    options: {
      kind: SenadoApiErrorKind;
      status?: number;
      url?: string;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = 'SenadoApiClientError';
    this.kind = options.kind;
    this.status = options.status;
    this.url = options.url;
  }
}

export type SenadoJsonMode = 'suffix' | 'accept-header';

export type SenadoFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface SenadoApiClientOptions {
  baseUrl?: string;
  fetch?: SenadoFetch;
  jsonMode?: SenadoJsonMode;
  timeoutMs?: number;
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

export interface SenadoSenadorPayload {
  IdentificacaoParlamentar?: SenadoIdentificacaoParlamentarPayload | null;
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

export interface GetSenadoMateriasPesquisaOptions {
  termo: string;
}

interface SenadoDetalheParlamentarResponse {
  DetalheParlamentar?: {
    Parlamentar?: SenadoSenadorPayload | null;
  } | null;
}

interface SenadoDetalheSenadorResponse {
  DetalheSenador?: SenadoSenadorPayload | null;
}

interface SenadoDetalheMateriaResponse {
  DetalheMateria?: {
    Materia?: SenadoMateriaPayload | null;
  } | null;
}

type NestedPath = readonly string[];

function getDefaultFetch(): SenadoFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new SenadoApiClientError('Fetch global indisponivel para consultar o Senado.', {
      kind: 'network'
    });
  }

  return globalThis.fetch.bind(globalThis);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNestedValue(value: unknown, path: NestedPath) {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function toArray<T>(value: unknown): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  return Array.isArray(value) ? (value as T[]) : [value as T];
}

export class SenadoApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: SenadoFetch;
  private readonly jsonMode: SenadoJsonMode;
  private readonly timeoutMs: number;

  constructor(options: SenadoApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? SENADO_API_BASE_URL;
    this.fetcher = options.fetch ?? getDefaultFetch();
    this.jsonMode = options.jsonMode ?? 'suffix';
    this.timeoutMs = options.timeoutMs ?? SENADO_API_DEFAULT_TIMEOUT_MS;
  }

  async getSenadorById(id: number | string): Promise<SenadoSenadorPayload> {
    return this.requestNestedData<SenadoSenadorPayload>(`senador/${id}`, [
      ['DetalheParlamentar', 'Parlamentar'],
      ['DetalheSenador']
    ]);
  }

  async getSenadoresAtuais(): Promise<SenadoSenadorPayload[]> {
    return this.requestNestedArray<SenadoSenadorPayload>('senador/lista/atual', [
      ['ListaParlamentarEmExercicio', 'Parlamentares', 'Parlamentar'],
      ['ListaParlamentarEmExercicio', 'Parlamentar']
    ]);
  }

  async getMateriaById(id: number | string): Promise<SenadoMateriaPayload> {
    return this.requestNestedData<SenadoMateriaPayload>(`materia/${id}`, [
      ['DetalheMateria', 'Materia']
    ]);
  }

  async searchMaterias(
    options: GetSenadoMateriasPesquisaOptions
  ): Promise<SenadoMateriaPayload[]> {
    return this.requestNestedArray<SenadoMateriaPayload>(
      'materia/pesquisa/lista',
      [
        ['PesquisaBasicaMateria', 'Materias', 'Materia'],
        ['PesquisaBasicaMateria', 'Materia']
      ],
      {
        termo: options.termo
      }
    );
  }

  private buildUrl(path: string, params: Record<string, string | number | undefined> = {}) {
    const normalizedBaseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    const normalizedPath = path.replace(/^\/+/, '');
    const jsonPath =
      this.jsonMode === 'suffix' && !normalizedPath.endsWith('.json')
        ? `${normalizedPath}.json`
        : normalizedPath;
    const url = new URL(jsonPath, normalizedBaseUrl);

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
      if (cause instanceof SenadoApiClientError) {
        throw cause;
      }

      throw new SenadoApiClientError('Nao foi possivel consultar a API do Senado.', {
        kind: 'network',
        url,
        cause
      });
    }

    if (!response.ok) {
      throw new SenadoApiClientError('A API do Senado retornou uma falha HTTP.', {
        kind: 'http',
        status: response.status,
        url
      });
    }

    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new SenadoApiClientError('A API do Senado retornou JSON invalido.', {
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
            new SenadoApiClientError('A consulta a API do Senado excedeu o tempo limite.', {
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
      if (cause instanceof SenadoApiClientError) {
        throw cause;
      }

      if (controller.signal.aborted) {
        throw new SenadoApiClientError('A consulta a API do Senado excedeu o tempo limite.', {
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

  private async requestNestedData<T>(path: string, acceptedPaths: NestedPath[]): Promise<T> {
    const envelope = await this.requestJson<
      SenadoDetalheParlamentarResponse | SenadoDetalheSenadorResponse | SenadoDetalheMateriaResponse
    >(path);

    for (const acceptedPath of acceptedPaths) {
      const nestedValue = readNestedValue(envelope, acceptedPath);

      if (nestedValue !== null && nestedValue !== undefined) {
        return nestedValue as T;
      }
    }

    throw new SenadoApiClientError('A resposta do Senado nao contem dados validos.', {
      kind: 'invalid-payload'
    });
  }

  private async requestNestedArray<T>(
    path: string,
    acceptedPaths: NestedPath[],
    params?: Record<string, string | number | undefined>
  ): Promise<T[]> {
    const envelope = await this.requestJson<unknown>(path, params);

    for (const acceptedPath of acceptedPaths) {
      const nestedValue = readNestedValue(envelope, acceptedPath);

      if (nestedValue !== null && nestedValue !== undefined) {
        return toArray<T>(nestedValue);
      }
    }

    throw new SenadoApiClientError('A resposta do Senado nao contem lista de dados valida.', {
      kind: 'invalid-payload'
    });
  }
}
