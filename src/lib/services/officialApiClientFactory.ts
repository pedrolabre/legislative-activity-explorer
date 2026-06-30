import { CamaraApiClient } from '$lib/api/camaraClient';
import {
  createLegislativeApiFetch,
  resolveLegislativeDataSourceConfig,
  type LegislativeApiFetch,
  type LegislativeDataSourceConfig,
  type LegislativeDataSourceEnv
} from '$lib/api/legislativeDataSourceConfig';
import { SenadoApiClient } from '$lib/api/senadoClient';

export interface OfficialApiClientFactoryOptions {
  dataSourceConfig?: LegislativeDataSourceConfig;
  dataSourceEnv?: LegislativeDataSourceEnv;
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
    PUBLIC_LEGISLATIVE_PROXY_URL: import.meta.env.PUBLIC_LEGISLATIVE_PROXY_URL
  };
}

function createConfiguredLegislativeFetch(
  config: LegislativeDataSourceConfig,
  fetcher?: LegislativeApiFetch
) {
  return fetcher
    ? createLegislativeApiFetch(config, fetcher)
    : createLegislativeApiFetch(config);
}

export function createOfficialApiClients(
  options: OfficialApiClientFactoryOptions = {}
): OfficialApiClients {
  const config =
    options.dataSourceConfig ??
    resolveLegislativeDataSourceConfig(options.dataSourceEnv ?? getRuntimeDataSourceEnv());
  const fetch = createConfiguredLegislativeFetch(config, options.fetch);

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
