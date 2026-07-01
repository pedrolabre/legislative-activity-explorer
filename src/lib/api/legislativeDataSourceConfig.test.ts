import { describe, expect, it } from 'vitest';
import { CAMARA_API_BASE_URL } from './camaraClient';
import {
  buildLegislativeProxyRequestUrl,
  createLegislativeApiFetch,
  isAllowedLegislativeApiTargetUrl,
  resolveLegislativeDataSourceConfig,
  type LegislativeApiFetch
} from './legislativeDataSourceConfig';
import { SENADO_API_BASE_URL } from './senadoClient';

describe('resolveLegislativeDataSourceConfig', () => {
  it('uses direct official API URLs when no public proxy is configured', () => {
    const config = resolveLegislativeDataSourceConfig();

    expect(config).toEqual({
      mode: 'direct',
      camaraBaseUrl: CAMARA_API_BASE_URL,
      senadoBaseUrl: SENADO_API_BASE_URL,
      issue: undefined
    });
  });

  it('uses the public proxy URL only when it is explicitly configured', () => {
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_PROXY_URL: ' https://worker.example/legislative '
    });

    expect(config).toEqual({
      mode: 'proxy',
      camaraBaseUrl: CAMARA_API_BASE_URL,
      senadoBaseUrl: SENADO_API_BASE_URL,
      proxyUrl: 'https://worker.example/legislative'
    });
  });

  it('falls back to direct URLs when the public proxy URL is invalid', () => {
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_PROXY_URL: 'not a url'
    });

    expect(config).toMatchObject({
      mode: 'direct',
      issue: 'invalid-proxy-url'
    });
  });

  it('does not accept credentials, query strings or hashes in the public proxy URL', () => {
    expect(
      resolveLegislativeDataSourceConfig({
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://user:pass@worker.example/legislative'
      })
    ).toMatchObject({
      mode: 'direct',
      issue: 'proxy-url-with-credentials'
    });
    expect(
      resolveLegislativeDataSourceConfig({
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative?modo=proxy'
      })
    ).toMatchObject({
      mode: 'direct',
      issue: 'proxy-url-with-query-or-hash'
    });
    expect(
      resolveLegislativeDataSourceConfig({
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative#fragmento'
      })
    ).toMatchObject({
      mode: 'direct',
      issue: 'proxy-url-with-query-or-hash'
    });
  });

  it('does not accept an insecure public proxy URL protocol', () => {
    expect(
      resolveLegislativeDataSourceConfig({
        PUBLIC_LEGISLATIVE_PROXY_URL: 'http://worker.example/legislative'
      })
    ).toMatchObject({
      mode: 'direct',
      issue: 'proxy-url-with-unsupported-protocol'
    });
  });
});

describe('buildLegislativeProxyRequestUrl', () => {
  it('routes an allowed official target URL through the proxy query parameter', () => {
    const targetUrl = `${CAMARA_API_BASE_URL}/deputados?nome=Ana`;
    const proxiedUrl = new URL(
      buildLegislativeProxyRequestUrl('https://worker.example/legislative', targetUrl)
    );

    expect(proxiedUrl.origin + proxiedUrl.pathname).toBe('https://worker.example/legislative');
    expect(proxiedUrl.searchParams.get('url')).toBe(targetUrl);
  });

  it('rejects non-official target URLs before calling the proxy', () => {
    expect(isAllowedLegislativeApiTargetUrl('https://example.com/api')).toBe(false);
    expect(() =>
      buildLegislativeProxyRequestUrl(
        'https://worker.example/legislative',
        'https://example.com/api'
      )
    ).toThrow('URL oficial nao autorizada');
  });

  it('rejects insecure official target URLs before calling the proxy', () => {
    expect(isAllowedLegislativeApiTargetUrl('http://dadosabertos.camara.leg.br/api/v2')).toBe(
      false
    );
    expect(() =>
      buildLegislativeProxyRequestUrl(
        'https://worker.example/legislative',
        'http://dadosabertos.camara.leg.br/api/v2/deputados'
      )
    ).toThrow('URL oficial nao autorizada');
  });
});

describe('createLegislativeApiFetch', () => {
  it('keeps direct mode as a plain injected fetch call', async () => {
    const calls: { input: string; init?: RequestInit }[] = [];
    const fetcher: LegislativeApiFetch = async (input, init) => {
      calls.push({ input, init });
      return new Response('{}');
    };
    const config = resolveLegislativeDataSourceConfig();
    const fetch = createLegislativeApiFetch(config, fetcher);

    await fetch(`${CAMARA_API_BASE_URL}/deputados/10`, {
      headers: {
        Accept: 'application/json'
      }
    });

    expect(calls).toEqual([
      {
        input: `${CAMARA_API_BASE_URL}/deputados/10`,
        init: {
          headers: {
            Accept: 'application/json'
          }
        }
      }
    ]);
  });

  it('wraps allowed official GET requests through the configured proxy', async () => {
    const calls: { input: string; init?: RequestInit }[] = [];
    const fetcher: LegislativeApiFetch = async (input, init) => {
      calls.push({ input, init });
      return new Response('{}');
    };
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
    });
    const fetch = createLegislativeApiFetch(config, fetcher);
    const targetUrl = `${SENADO_API_BASE_URL}/materia/300.json`;

    await fetch(targetUrl, {
      headers: {
        Accept: 'application/json'
      }
    });

    const proxiedUrl = new URL(calls[0].input);

    expect(proxiedUrl.origin + proxiedUrl.pathname).toBe('https://worker.example/legislative');
    expect(proxiedUrl.searchParams.get('url')).toBe(targetUrl);
    expect(calls[0].init).toEqual({
      headers: {
        Accept: 'application/json'
      }
    });
  });

  it('rejects non-GET methods in proxy mode', () => {
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
    });
    const fetch = createLegislativeApiFetch(config, async () => new Response('{}'));

    expect(() =>
      fetch(`${CAMARA_API_BASE_URL}/deputados/10`, {
        method: 'POST'
      })
    ).toThrow('aceita apenas consultas GET');
  });
});
