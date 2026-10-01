import { CAMARA_API_BASE_URL } from './camaraClient';
import {
  isAllowedOfficialApiTargetUrl,
  isHttpsProtocol,
  LEGISLATIVE_OFFICIAL_ALLOWED_HOSTS,
  type LegislativeOfficialAllowedHost
} from './officialApiConfig';
import { SENADO_API_BASE_URL } from './senadoClient';

export const PUBLIC_LEGISLATIVE_PROXY_URL_ENV = 'PUBLIC_LEGISLATIVE_PROXY_URL';
export const PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE_ENV = 'PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE';
export const LEGISLATIVE_PROXY_QUERY_PARAM = 'url';
export const LEGISLATIVE_DATA_SOURCE_ALLOWED_HOSTS = LEGISLATIVE_OFFICIAL_ALLOWED_HOSTS;

export type LegislativeDataSourceAllowedHost = LegislativeOfficialAllowedHost;
export type LegislativeDataSourceMode = 'direct' | 'proxy' | 'fallback';
export type LegislativeDataSourceConfigIssue =
  | 'invalid-proxy-url'
  | 'proxy-url-with-credentials'
  | 'proxy-url-with-query-or-hash'
  | 'proxy-url-with-unsupported-protocol'
  | 'unsupported-data-source-mode';
export type LegislativeApiFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface LegislativeDataSourceEnv {
  PUBLIC_LEGISLATIVE_PROXY_URL?: string | null;
  PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE?: string | null;
}

export interface LegislativeDataSourceBaseConfig {
  camaraBaseUrl: string;
  senadoBaseUrl: string;
}

export interface DirectLegislativeDataSourceConfig extends LegislativeDataSourceBaseConfig {
  mode: 'direct';
  proxyUrl?: undefined;
  issue?: LegislativeDataSourceConfigIssue;
}

export interface ProxyLegislativeDataSourceConfig extends LegislativeDataSourceBaseConfig {
  mode: 'proxy';
  proxyUrl: string;
  issue?: undefined;
}

export interface FallbackLegislativeDataSourceConfig extends LegislativeDataSourceBaseConfig {
  mode: 'fallback';
  proxyUrl: string;
  issue?: undefined;
}

export type LegislativeDataSourceConfig =
  | DirectLegislativeDataSourceConfig
  | ProxyLegislativeDataSourceConfig
  | FallbackLegislativeDataSourceConfig;

export interface ResolveLegislativeDataSourceOptions {
  mode?: LegislativeDataSourceMode;
  defaultMode?: LegislativeDataSourceMode;
}

export interface LegislativeFallbackEvent {
  targetUrl: string;
  proxyUrl: string;
  proxiedUrl: string;
  reason: 'network-error' | 'server-error';
  status?: number;
  error?: unknown;
}

export type LegislativeFallbackListener = (event: LegislativeFallbackEvent) => void;

export interface LegislativeApiFetchOptions {
  onFallback?: LegislativeFallbackListener;
}

interface ProxyUrlResolution {
  proxyUrl?: string;
  issue?: LegislativeDataSourceConfigIssue;
}

export class LegislativeDataSourceConfigError extends Error {
  issue?: LegislativeDataSourceConfigIssue;

  constructor(message: string, issue?: LegislativeDataSourceConfigIssue) {
    super(message);
    this.name = 'LegislativeDataSourceConfigError';
    this.issue = issue;
  }
}

function resolvePublicProxyUrl(rawProxyUrl: string | null | undefined): ProxyUrlResolution {
  const trimmedProxyUrl = rawProxyUrl?.trim();

  if (!trimmedProxyUrl) {
    return {};
  }

  let proxyUrl: URL;

  try {
    proxyUrl = new URL(trimmedProxyUrl);
  } catch {
    return {
      issue: 'invalid-proxy-url'
    };
  }

  if (!isHttpsProtocol(proxyUrl.protocol)) {
    return {
      issue: 'proxy-url-with-unsupported-protocol'
    };
  }

  if (proxyUrl.username || proxyUrl.password) {
    return {
      issue: 'proxy-url-with-credentials'
    };
  }

  if (proxyUrl.search || proxyUrl.hash) {
    return {
      issue: 'proxy-url-with-query-or-hash'
    };
  }

  return {
    proxyUrl: proxyUrl.toString()
  };
}

function parseMode(
  rawMode?: string | null
): { mode?: LegislativeDataSourceMode; issue?: LegislativeDataSourceConfigIssue } {
  if (!rawMode) {
    return {};
  }

  const normalized = rawMode.trim().toLowerCase();

  if (normalized === 'direct' || normalized === 'proxy' || normalized === 'fallback') {
    return { mode: normalized };
  }

  return { issue: 'unsupported-data-source-mode' };
}

export function resolveLegislativeDataSourceConfig(
  env: LegislativeDataSourceEnv = {},
  options?: ResolveLegislativeDataSourceOptions
): LegislativeDataSourceConfig {
  const proxyResolution = resolvePublicProxyUrl(env.PUBLIC_LEGISLATIVE_PROXY_URL);
  const baseConfig = {
    camaraBaseUrl: CAMARA_API_BASE_URL,
    senadoBaseUrl: SENADO_API_BASE_URL
  };

  const parsedEnvMode = parseMode(env.PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE);
  const requestedMode = options?.mode ?? parsedEnvMode.mode;
  const issue = proxyResolution.issue ?? parsedEnvMode.issue;

  if (requestedMode === 'direct') {
    return {
      ...baseConfig,
      mode: 'direct',
      issue
    };
  }

  if (proxyResolution.proxyUrl) {
    if (requestedMode === 'fallback') {
      return {
        ...baseConfig,
        mode: 'fallback',
        proxyUrl: proxyResolution.proxyUrl
      };
    }

    const mode = options?.defaultMode === 'fallback' && !requestedMode ? 'fallback' : 'proxy';

    return {
      ...baseConfig,
      mode,
      proxyUrl: proxyResolution.proxyUrl
    };
  }

  return {
    ...baseConfig,
    mode: 'direct',
    issue
  };
}

export function isAllowedLegislativeApiTargetUrl(targetUrl: string) {
  return isAllowedOfficialApiTargetUrl(targetUrl);
}

export function buildLegislativeProxyRequestUrl(proxyUrl: string, targetUrl: string) {
  const proxyResolution = resolvePublicProxyUrl(proxyUrl);

  if (!proxyResolution.proxyUrl) {
    throw new LegislativeDataSourceConfigError(
      'URL publica do proxy legislativo invalida.',
      proxyResolution.issue
    );
  }

  if (!isAllowedLegislativeApiTargetUrl(targetUrl)) {
    throw new LegislativeDataSourceConfigError(
      'URL oficial nao autorizada para roteamento pelo proxy.'
    );
  }

  const requestUrl = new URL(proxyResolution.proxyUrl);
  requestUrl.searchParams.set(LEGISLATIVE_PROXY_QUERY_PARAM, new URL(targetUrl).toString());

  return requestUrl.toString();
}

export function isEligibleLegislativeNetworkError(error: unknown, init?: RequestInit): boolean {
  if (init?.signal?.aborted) {
    return false;
  }

  if (error instanceof LegislativeDataSourceConfigError) {
    return false;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return false;
  }

  return true;
}

export function isEligibleLegislativeStatusForFallback(status: number): boolean {
  return status >= 500 && status <= 599;
}

export function isEligibleLegislativeResponseForFallback(response: Response): boolean {
  return isEligibleLegislativeStatusForFallback(response.status);
}

export function isEligibleLegislativeMethodForFallback(method?: string): boolean {
  const normalizedMethod = method?.toUpperCase() ?? 'GET';
  return normalizedMethod === 'GET';
}

function getDefaultLegislativeApiFetch(): LegislativeApiFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new LegislativeDataSourceConfigError('Fetch global indisponivel para consultas oficiais.');
  }

  return globalThis.fetch.bind(globalThis);
}

export function createLegislativeApiFetch(
  config: LegislativeDataSourceConfig,
  fetcher: LegislativeApiFetch = getDefaultLegislativeApiFetch(),
  options?: LegislativeApiFetchOptions
): LegislativeApiFetch {
  if (config.mode === 'direct') {
    return fetcher;
  }

  if (config.mode === 'proxy') {
    return (input, init) => {
      const method = init?.method?.toUpperCase() ?? 'GET';

      if (method !== 'GET') {
        throw new LegislativeDataSourceConfigError(
          'O proxy legislativo opcional aceita apenas consultas GET.'
        );
      }

      return fetcher(buildLegislativeProxyRequestUrl(config.proxyUrl, input), init);
    };
  }

  // config.mode === 'fallback'
  return async (input, init) => {
    const method = init?.method?.toUpperCase() ?? 'GET';
    const isGet = isEligibleLegislativeMethodForFallback(method);

    if (!isGet || !isAllowedLegislativeApiTargetUrl(input)) {
      return fetcher(input, init);
    }

    let directResponse: Response | undefined;
    let directError: unknown;

    try {
      directResponse = await fetcher(input, init);
    } catch (cause) {
      directError = cause;
    }

    if (directError !== undefined) {
      if (isEligibleLegislativeNetworkError(directError, init)) {
        const proxiedUrl = buildLegislativeProxyRequestUrl(config.proxyUrl, input);

        options?.onFallback?.({
          targetUrl: input,
          proxyUrl: config.proxyUrl,
          proxiedUrl,
          reason: 'network-error',
          error: directError
        });

        return fetcher(proxiedUrl, init);
      }

      throw directError;
    }

    if (directResponse) {
      if (isEligibleLegislativeResponseForFallback(directResponse)) {
        try {
          const proxiedUrl = buildLegislativeProxyRequestUrl(config.proxyUrl, input);

          options?.onFallback?.({
            targetUrl: input,
            proxyUrl: config.proxyUrl,
            proxiedUrl,
            reason: 'server-error',
            status: directResponse.status
          });

          return await fetcher(proxiedUrl, init);
        } catch {
          return directResponse;
        }
      }

      return directResponse;
    }

    throw new LegislativeDataSourceConfigError(
      'Falha inesperada ao executar fetch oficial com contingencia.'
    );
  };
}
