import { describe, expect, it } from 'vitest';
import { CAMARA_API_BASE_URL } from './camaraClient';
import {
  buildLegislativeProxyRequestUrl,
  createLegislativeApiFetch,
  isAllowedLegislativeApiTargetUrl,
  isEligibleLegislativeMethodForFallback,
  isEligibleLegislativeNetworkError,
  isEligibleLegislativeResponseForFallback,
  isEligibleLegislativeStatusForFallback,
  LegislativeDataSourceConfigError,
  resolveLegislativeDataSourceConfig,
  type LegislativeApiFetch,
  type LegislativeFallbackEvent
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

  it('resolves fallback mode when configured via environment variable with valid proxy', () => {
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative',
      PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE: 'fallback'
    });

    expect(config).toEqual({
      mode: 'fallback',
      camaraBaseUrl: CAMARA_API_BASE_URL,
      senadoBaseUrl: SENADO_API_BASE_URL,
      proxyUrl: 'https://worker.example/legislative'
    });
  });

  it('resolves fallback mode when requested via options with valid proxy', () => {
    const config = resolveLegislativeDataSourceConfig(
      {
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
      },
      {
        mode: 'fallback'
      }
    );

    expect(config).toEqual({
      mode: 'fallback',
      camaraBaseUrl: CAMARA_API_BASE_URL,
      senadoBaseUrl: SENADO_API_BASE_URL,
      proxyUrl: 'https://worker.example/legislative'
    });
  });

  it('prioritizes direct mode when explicitly requested even if proxy URL is configured', () => {
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative',
      PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE: 'direct'
    });

    expect(config).toEqual({
      mode: 'direct',
      camaraBaseUrl: CAMARA_API_BASE_URL,
      senadoBaseUrl: SENADO_API_BASE_URL,
      issue: undefined
    });
  });

  it('falls back to direct mode when fallback is requested but no proxy URL exists', () => {
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE: 'fallback'
    });

    expect(config).toEqual({
      mode: 'direct',
      camaraBaseUrl: CAMARA_API_BASE_URL,
      senadoBaseUrl: SENADO_API_BASE_URL,
      issue: undefined
    });
  });

  it('flags unsupported mode values as issues and falls back to direct', () => {
    const config = resolveLegislativeDataSourceConfig({
      PUBLIC_LEGISLATIVE_DATA_SOURCE_MODE: 'modo-invalido'
    });

    expect(config).toMatchObject({
      mode: 'direct',
      issue: 'unsupported-data-source-mode'
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

describe('eligibility helper functions', () => {
  it('identifies network errors as eligible for fallback', () => {
    expect(isEligibleLegislativeNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isEligibleLegislativeNetworkError(new Error('Connection reset'))).toBe(true);
  });

  it('does not treat AbortError or already aborted signals as eligible network errors', () => {
    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';

    expect(isEligibleLegislativeNetworkError(abortError)).toBe(false);

    const controller = new AbortController();
    controller.abort();

    expect(
      isEligibleLegislativeNetworkError(new TypeError('Failed to fetch'), {
        signal: controller.signal
      })
    ).toBe(false);
  });

  it('does not treat config errors as eligible network errors', () => {
    expect(
      isEligibleLegislativeNetworkError(
        new LegislativeDataSourceConfigError('Config error')
      )
    ).toBe(false);
  });

  it('identifies only HTTP 5xx statuses as eligible for fallback', () => {
    expect(isEligibleLegislativeStatusForFallback(500)).toBe(true);
    expect(isEligibleLegislativeStatusForFallback(502)).toBe(true);
    expect(isEligibleLegislativeStatusForFallback(503)).toBe(true);
    expect(isEligibleLegislativeStatusForFallback(504)).toBe(true);

    expect(isEligibleLegislativeStatusForFallback(200)).toBe(false);
    expect(isEligibleLegislativeStatusForFallback(400)).toBe(false);
    expect(isEligibleLegislativeStatusForFallback(404)).toBe(false);
    expect(isEligibleLegislativeStatusForFallback(422)).toBe(false);
  });

  it('evaluates Response status eligibility correctly', () => {
    expect(isEligibleLegislativeResponseForFallback(new Response(null, { status: 503 }))).toBe(
      true
    );
    expect(isEligibleLegislativeResponseForFallback(new Response(null, { status: 200 }))).toBe(
      false
    );
    expect(isEligibleLegislativeResponseForFallback(new Response(null, { status: 404 }))).toBe(
      false
    );
  });

  it('allows only GET requests for proxy fallback', () => {
    expect(isEligibleLegislativeMethodForFallback('GET')).toBe(true);
    expect(isEligibleLegislativeMethodForFallback('get')).toBe(true);
    expect(isEligibleLegislativeMethodForFallback(undefined)).toBe(true);
    expect(isEligibleLegislativeMethodForFallback('POST')).toBe(false);
    expect(isEligibleLegislativeMethodForFallback('PUT')).toBe(false);
    expect(isEligibleLegislativeMethodForFallback('DELETE')).toBe(false);
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

  describe('fallback mode', () => {
    const fallbackConfig = resolveLegislativeDataSourceConfig(
      {
        PUBLIC_LEGISLATIVE_PROXY_URL: 'https://worker.example/legislative'
      },
      {
        mode: 'fallback'
      }
    );

    it('returns direct response without calling proxy when direct fetch succeeds', async () => {
      const calls: string[] = [];
      const fallbackEvents: LegislativeFallbackEvent[] = [];
      const fetcher: LegislativeApiFetch = async (input) => {
        calls.push(input);
        return new Response('{"direct": true}', { status: 200 });
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher, {
        onFallback: (event) => fallbackEvents.push(event)
      });

      const response = await fetch(`${CAMARA_API_BASE_URL}/deputados/123`);
      const body = await response.json();

      expect(body).toEqual({ direct: true });
      expect(calls).toEqual([`${CAMARA_API_BASE_URL}/deputados/123`]);
      expect(fallbackEvents).toHaveLength(0);
    });

    it('falls back transparently to proxy when direct call throws a network error', async () => {
      const calls: string[] = [];
      const fallbackEvents: LegislativeFallbackEvent[] = [];
      const targetUrl = `${CAMARA_API_BASE_URL}/deputados/123`;

      const fetcher: LegislativeApiFetch = async (input) => {
        calls.push(input);
        if (input === targetUrl) {
          throw new TypeError('Failed to fetch');
        }
        return new Response('{"proxied": true}', { status: 200 });
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher, {
        onFallback: (event) => fallbackEvents.push(event)
      });

      const response = await fetch(targetUrl);
      const body = await response.json();

      expect(body).toEqual({ proxied: true });
      expect(calls).toHaveLength(2);
      expect(calls[0]).toBe(targetUrl);

      const proxiedUrl = new URL(calls[1]);
      expect(proxiedUrl.origin + proxiedUrl.pathname).toBe('https://worker.example/legislative');
      expect(proxiedUrl.searchParams.get('url')).toBe(targetUrl);

      expect(fallbackEvents).toHaveLength(1);
      expect(fallbackEvents[0]).toMatchObject({
        targetUrl,
        proxyUrl: 'https://worker.example/legislative',
        reason: 'network-error'
      });
    });

    it('falls back transparently to proxy when direct call returns HTTP 503', async () => {
      const calls: string[] = [];
      const fallbackEvents: LegislativeFallbackEvent[] = [];
      const targetUrl = `${SENADO_API_BASE_URL}/materia/300.json`;

      const fetcher: LegislativeApiFetch = async (input) => {
        calls.push(input);
        if (input === targetUrl) {
          return new Response('{"error": "Indisponivel"}', { status: 503 });
        }
        return new Response('{"proxied": true, "status": "ok"}', { status: 200 });
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher, {
        onFallback: (event) => fallbackEvents.push(event)
      });

      const response = await fetch(targetUrl);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ proxied: true, status: 'ok' });
      expect(calls).toHaveLength(2);
      expect(calls[0]).toBe(targetUrl);

      expect(fallbackEvents).toHaveLength(1);
      expect(fallbackEvents[0]).toMatchObject({
        targetUrl,
        reason: 'server-error',
        status: 503
      });
    });

    it('does not trigger fallback for 404 or 400 responses', async () => {
      const calls: string[] = [];
      const fallbackEvents: LegislativeFallbackEvent[] = [];
      const targetUrl = `${CAMARA_API_BASE_URL}/proposicoes/999999`;

      const fetcher: LegislativeApiFetch = async (input) => {
        calls.push(input);
        return new Response('{"dados": null}', { status: 404 });
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher, {
        onFallback: (event) => fallbackEvents.push(event)
      });

      const response = await fetch(targetUrl);

      expect(response.status).toBe(404);
      expect(calls).toEqual([targetUrl]);
      expect(fallbackEvents).toHaveLength(0);
    });

    it('does not trigger proxy fallback for non-GET methods', async () => {
      const calls: string[] = [];
      const targetUrl = `${CAMARA_API_BASE_URL}/deputados/123`;

      const fetcher: LegislativeApiFetch = async (input, init) => {
        calls.push(`${init?.method ?? 'GET'} ${input}`);
        throw new TypeError('Failed to fetch');
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher);

      await expect(
        fetch(targetUrl, {
          method: 'POST'
        })
      ).rejects.toThrow('Failed to fetch');

      expect(calls).toEqual([`POST ${targetUrl}`]);
    });

    it('does not trigger proxy fallback when request is aborted', async () => {
      const calls: string[] = [];
      const controller = new AbortController();
      controller.abort();

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const fetcher: LegislativeApiFetch = async (input) => {
        calls.push(input);
        throw abortError;
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher);

      await expect(
        fetch(`${CAMARA_API_BASE_URL}/deputados/123`, {
          signal: controller.signal
        })
      ).rejects.toThrow('The operation was aborted');

      expect(calls).toHaveLength(1);
    });

    it('returns direct 500 response if fallback proxy call throws an error', async () => {
      const targetUrl = `${CAMARA_API_BASE_URL}/deputados/123`;

      const fetcher: LegislativeApiFetch = async (input) => {
        if (input === targetUrl) {
          return new Response('Direct server error', { status: 500 });
        }
        throw new TypeError('Proxy unavailable');
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher);
      const response = await fetch(targetUrl);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Direct server error');
    });

    it('throws proxy error when direct network failure is followed by proxy network failure', async () => {
      const targetUrl = `${CAMARA_API_BASE_URL}/deputados/123`;

      const fetcher: LegislativeApiFetch = async (input) => {
        if (input === targetUrl) {
          throw new TypeError('Direct CORS failure');
        }
        throw new TypeError('Proxy connection refused');
      };

      const fetch = createLegislativeApiFetch(fallbackConfig, fetcher);

      await expect(fetch(targetUrl)).rejects.toThrow('Proxy connection refused');
    });
  });
});
