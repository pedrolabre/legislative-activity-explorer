import { CAMARA_API_BASE_URL } from './camaraClient';
import { SENADO_API_BASE_URL } from './senadoClient';

export const PUBLIC_LEGISLATIVE_PROXY_URL_ENV = 'PUBLIC_LEGISLATIVE_PROXY_URL';
export const LEGISLATIVE_PROXY_QUERY_PARAM = 'url';
export const LEGISLATIVE_DATA_SOURCE_ALLOWED_HOSTS = [
  'dadosabertos.camara.leg.br',
  'legis.senado.leg.br'
] as const;

export type LegislativeDataSourceAllowedHost =
  (typeof LEGISLATIVE_DATA_SOURCE_ALLOWED_HOSTS)[number];
export type LegislativeDataSourceMode = 'direct' | 'proxy';
export type LegislativeDataSourceConfigIssue =
  | 'invalid-proxy-url'
  | 'proxy-url-with-credentials'
  | 'proxy-url-with-query-or-hash'
  | 'proxy-url-with-unsupported-protocol';
export type LegislativeApiFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface LegislativeDataSourceEnv {
  PUBLIC_LEGISLATIVE_PROXY_URL?: string | null;
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

export type LegislativeDataSourceConfig =
  | DirectLegislativeDataSourceConfig
  | ProxyLegislativeDataSourceConfig;

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

function isHttpProtocol(protocol: string) {
  return protocol === 'http:' || protocol === 'https:';
}

function isAllowedOfficialHost(hostname: string): hostname is LegislativeDataSourceAllowedHost {
  const normalizedHostname = hostname.toLowerCase();

  return LEGISLATIVE_DATA_SOURCE_ALLOWED_HOSTS.some(
    (allowedHost) => allowedHost === normalizedHostname
  );
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

  if (!isHttpProtocol(proxyUrl.protocol)) {
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

export function resolveLegislativeDataSourceConfig(
  env: LegislativeDataSourceEnv = {}
): LegislativeDataSourceConfig {
  const proxyResolution = resolvePublicProxyUrl(env.PUBLIC_LEGISLATIVE_PROXY_URL);
  const baseConfig = {
    camaraBaseUrl: CAMARA_API_BASE_URL,
    senadoBaseUrl: SENADO_API_BASE_URL
  };

  if (proxyResolution.proxyUrl) {
    return {
      ...baseConfig,
      mode: 'proxy',
      proxyUrl: proxyResolution.proxyUrl
    };
  }

  return {
    ...baseConfig,
    mode: 'direct',
    issue: proxyResolution.issue
  };
}

export function isAllowedLegislativeApiTargetUrl(targetUrl: string) {
  let parsedTargetUrl: URL;

  try {
    parsedTargetUrl = new URL(targetUrl);
  } catch {
    return false;
  }

  return (
    isHttpProtocol(parsedTargetUrl.protocol) &&
    !parsedTargetUrl.username &&
    !parsedTargetUrl.password &&
    isAllowedOfficialHost(parsedTargetUrl.hostname)
  );
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

function getDefaultLegislativeApiFetch(): LegislativeApiFetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new LegislativeDataSourceConfigError('Fetch global indisponivel para consultas oficiais.');
  }

  return globalThis.fetch.bind(globalThis);
}

export function createLegislativeApiFetch(
  config: LegislativeDataSourceConfig,
  fetcher: LegislativeApiFetch = getDefaultLegislativeApiFetch()
): LegislativeApiFetch {
  if (config.mode === 'direct') {
    return fetcher;
  }

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
