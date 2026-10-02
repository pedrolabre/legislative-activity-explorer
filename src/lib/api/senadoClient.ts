import {
  buildHttpCacheKey,
  resolveHttpMemoryCache,
  type LegislativeHttpMemoryCache
} from './httpMemoryCache';
import { OFFICIAL_API_DEFAULT_TIMEOUT_MS } from './officialApiConfig';
import { OfficialApiClientError, type OfficialApiErrorKind } from './officialApiErrors';

export const SENADO_API_BASE_URL = 'https://legis.senado.leg.br/dadosabertos';
export const SENADO_API_DEFAULT_TIMEOUT_MS = OFFICIAL_API_DEFAULT_TIMEOUT_MS;

export type SenadoApiErrorKind = OfficialApiErrorKind;

export class SenadoApiClientError extends OfficialApiClientError {
  constructor(
    message: string,
    options: {
      kind: SenadoApiErrorKind;
      status?: number;
      url?: string;
      cause?: unknown;
    }
  ) {
    super(message, {
      ...options,
      source: 'senado',
      name: 'SenadoApiClientError'
    });
  }
}

export * from './senadoClientTypes';

import type {
  GetSenadoMateriasPesquisaOptions,
  GetSenadoProcessosOptions,
  GetSenadoRelatoriasOptions,
  GetSenadoVotacoesOptions,
  SenadoApiClientOptions,
  SenadoFetch,
  SenadoJsonMode,
  SenadoMandatoPayload,
  SenadoMateriaPayload,
  SenadoProcessoPayload,
  SenadoRelatoriaPayload,
  SenadoRequestOptions,
  SenadoSenadorPayload,
  SenadoVotacaoPayload
} from './senadoClientTypes';

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
  private readonly cacheInstance: LegislativeHttpMemoryCache | null;
  private readonly cacheTtlMs?: number;

  constructor(options: SenadoApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? SENADO_API_BASE_URL;
    this.fetcher = options.fetch ?? getDefaultFetch();
    this.jsonMode = options.jsonMode ?? 'suffix';
    this.timeoutMs = options.timeoutMs ?? SENADO_API_DEFAULT_TIMEOUT_MS;
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

  async getSenadorById(
    id: number | string,
    options?: SenadoRequestOptions
  ): Promise<SenadoSenadorPayload> {
    return this.requestNestedData<SenadoSenadorPayload>(
      `senador/${id}`,
      [
        ['DetalheParlamentar', 'Parlamentar'],
        ['DetalheSenador']
      ],
      undefined,
      options
    );
  }

  async getSenadoresAtuais(options?: SenadoRequestOptions): Promise<SenadoSenadorPayload[]> {
    return this.requestNestedArray<SenadoSenadorPayload>(
      'senador/lista/atual',
      [
        ['ListaParlamentarEmExercicio', 'Parlamentares', 'Parlamentar'],
        ['ListaParlamentarEmExercicio', 'Parlamentar']
      ],
      undefined,
      options
    );
  }

  async getSenadorMandatosById(
    id: number | string,
    options?: SenadoRequestOptions
  ): Promise<SenadoMandatoPayload[]> {
    return this.requestNestedArray<SenadoMandatoPayload>(
      `senador/${id}/mandatos`,
      [
        ['MandatosParlamentar', 'Parlamentar', 'Mandatos', 'Mandato'],
        ['MandatosParlamentar', 'Mandatos', 'Mandato'],
        ['ListaMandatos', 'Mandatos', 'Mandato'],
        ['ListaMandatoParlamentar', 'Mandatos', 'Mandato'],
        ['DetalheParlamentar', 'Parlamentar', 'Mandatos', 'Mandato'],
        ['Parlamentar', 'Mandatos', 'Mandato'],
        ['Mandatos', 'Mandato'],
        ['Mandato']
      ],
      undefined,
      options
    );
  }

  async getProcessoById(
    id: number | string,
    options?: SenadoRequestOptions
  ): Promise<SenadoProcessoPayload> {
    return this.requestJson<SenadoProcessoPayload>(`processo/${id}`, undefined, options);
  }

  async searchProcessos(options: GetSenadoProcessosOptions): Promise<SenadoProcessoPayload[]> {
    return this.requestNestedArray<SenadoProcessoPayload>(
      'processo',
      [[]],
      {
        termo: options.termo,
        sigla: options.sigla,
        numero: options.numero,
        ano: options.ano,
        codigoMateria: options.codigoMateria,
        idProcesso: options.idProcesso,
        codigoParlamentarAutor: options.codigoParlamentarAutor,
        tramitando: options.tramitando,
        numdias: options.numdias
      },
      options
    );
  }

  async searchRelatorias(options: GetSenadoRelatoriasOptions): Promise<SenadoRelatoriaPayload[]> {
    return this.requestNestedArray<SenadoRelatoriaPayload>(
      'processo/relatoria',
      [[]],
      {
        idProcesso: options.idProcesso,
        codigoMateria: options.codigoMateria,
        codigoParlamentar: options.codigoParlamentar,
        dataInicio: options.dataInicio,
        dataFim: options.dataFim
      },
      options
    );
  }

  async getVotacoes(options: GetSenadoVotacoesOptions): Promise<SenadoVotacaoPayload[]> {
    return this.requestNestedArray<SenadoVotacaoPayload>(
      'votacao',
      [[]],
      {
        idProcesso: options.idProcesso,
        codigoMateria: options.codigoMateria,
        sigla: options.sigla,
        numero: options.numero,
        ano: options.ano,
        codigoParlamentar: options.codigoParlamentar
      },
      options
    );
  }

  /**
   * Endpoint legado/depreciado pelo Senado. Mantido apenas para compatibilidade
   * com registros antigos que ainda tenham CodigoMateria como identificador.
   */
  async getMateriaById(
    id: number | string,
    options?: SenadoRequestOptions
  ): Promise<SenadoMateriaPayload> {
    return this.requestNestedData<SenadoMateriaPayload>(
      `materia/${id}`,
      [['DetalheMateria', 'Materia']],
      undefined,
      options
    );
  }

  /**
   * Endpoint legado/depreciado pelo Senado. A busca moderna usa /processo.
   */
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
      },
      options
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
    params?: Record<string, string | number | undefined>,
    requestOptions: SenadoRequestOptions = {}
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
      if (cause instanceof SenadoApiClientError) {
        throw cause;
      }

      if (requestOptions.signal?.aborted || isAbortError(cause)) {
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

    let data: T;

    try {
      data = (await response.json()) as T;
    } catch (cause) {
      if (requestOptions.signal?.aborted || isAbortError(cause)) {
        throw cause;
      }

      throw new SenadoApiClientError('A API do Senado retornou JSON invalido.', {
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

      if (externalSignal?.aborted) {
        throw cause;
      }

      if (isTimedOut || controller.signal.aborted) {
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
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  private async requestNestedData<T>(
    path: string,
    acceptedPaths: NestedPath[],
    params?: Record<string, string | number | undefined>,
    requestOptions?: SenadoRequestOptions
  ): Promise<T> {
    const envelope = await this.requestJson<
      SenadoDetalheParlamentarResponse | SenadoDetalheSenadorResponse | SenadoDetalheMateriaResponse
    >(path, params, requestOptions);

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
    params?: Record<string, string | number | undefined>,
    requestOptions?: SenadoRequestOptions
  ): Promise<T[]> {
    const envelope = await this.requestJson<unknown>(path, params, requestOptions);

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
