import { CamaraApiClient } from '$lib/api/camaraClient';
import {
  createLegislativeApiFetch,
  resolveLegislativeDataSourceConfig,
  type LegislativeApiFetch,
  type LegislativeDataSourceConfig,
  type LegislativeDataSourceEnv,
  type LegislativeDataSourceMode,
  type LegislativeFallbackListener
} from '$lib/api/legislativeDataSourceConfig';
import { SenadoApiClient } from '$lib/api/senadoClient';

export interface OfficialApiClientFactoryOptions {
  dataSourceConfig?: LegislativeDataSourceConfig;
  dataSourceEnv?: LegislativeDataSourceEnv;
  dataSourceMode?: LegislativeDataSourceMode;
  onFallback?: LegislativeFallbackListener;
  fetch?: LegislativeApiFetch;
  timeoutMs?: number;
}

export interface OfficialApiClients {
  config: LegislativeDataSourceConfig;
  camaraClient: CamaraApiClient;
  senadoClient: SenadoApiClient;
}

function getRuntimeDataSourceEnv(): LegislativeDataSourceEnv {
  return {
    PUBLIC_LEGISLATIVE_PROXY_URL: import.meta.env.PUBLIC_LEGISLATIVE_PROXY_URL,
    PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE: import.meta.env.PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE
  };
}

function createConfiguredLegislativeFetch(
  config: LegislativeDataSourceConfig,
  fetcher?: LegislativeApiFetch,
  onFallback?: LegislativeFallbackListener
) {
  const options = onFallback ? { onFallback } : undefined;

  return fetcher
    ? createLegislativeApiFetch(config, fetcher, options)
    : createLegislativeApiFetch(config, undefined, options);
}

export function createOfficialApiClients(
  options: OfficialApiClientFactoryOptions = {}
): OfficialApiClients {
  const config =
    options.dataSourceConfig ??
    resolveLegislativeDataSourceConfig(
      options.dataSourceEnv ?? getRuntimeDataSourceEnv(),
      options.dataSourceMode ? { mode: options.dataSourceMode } : undefined
    );
  const fetch = createConfiguredLegislativeFetch(config, options.fetch, options.onFallback);

  return {
    config,
    camaraClient: new CamaraApiClient({
      baseUrl: config.camaraBaseUrl,
      fetch,
      timeoutMs: options.timeoutMs
    }),
    senadoClient: new SenadoApiClient({
      baseUrl: config.senadoBaseUrl,
      fetch,
      timeoutMs: options.timeoutMs
    })
  };
}
