export const LEGISLATIVE_PROXY_QUERY_PARAM = 'url';
export const LEGISLATIVE_PROXY_CACHE_TTL_SECONDS = 300;
export const LEGISLATIVE_PROXY_ALLOWED_HOSTS = [
  'dadosabertos.camara.leg.br',
  'legis.senado.leg.br'
] as const;

export type LegislativeProxyAllowedHost = (typeof LEGISLATIVE_PROXY_ALLOWED_HOSTS)[number];
export type LegislativeProxyFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface LegislativeProxyCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface LegislativeProxyExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface LegislativeProxyHandlerOptions {
  cache?: LegislativeProxyCache;
  fetcher?: LegislativeProxyFetch;
  waitUntil?: (promise: Promise<unknown>) => void;
}

type TargetValidationResult =
  | {
      ok: true;
      targetUrl: URL;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Max-Age': '86400'
} as const;

function appendCorsHeaders(headers: Headers) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  return headers;
}

function createJsonResponse(status: number, message: string) {
  const headers = appendCorsHeaders(
    new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    })
  );

  return new Response(JSON.stringify({ error: message }), {
    status,
    headers
  });
}

function createOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: appendCorsHeaders(new Headers())
  });
}

function isHttpProtocol(protocol: string) {
  return protocol === 'http:' || protocol === 'https:';
}

function isAllowedHost(hostname: string): hostname is LegislativeProxyAllowedHost {
  const normalizedHostname = hostname.toLowerCase();

  return LEGISLATIVE_PROXY_ALLOWED_HOSTS.some((allowedHost) => allowedHost === normalizedHostname);
}

export function validateLegislativeProxyTarget(request: Request): TargetValidationResult {
  const requestUrl = new URL(request.url);
  const rawTargetUrl = requestUrl.searchParams.get(LEGISLATIVE_PROXY_QUERY_PARAM)?.trim();

  if (!rawTargetUrl) {
    return {
      ok: false,
      status: 400,
      message: 'URL oficial nao informada para consulta.'
    };
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(rawTargetUrl);
  } catch {
    return {
      ok: false,
      status: 400,
      message: 'URL oficial invalida para consulta.'
    };
  }

  if (!isHttpProtocol(targetUrl.protocol)) {
    return {
      ok: false,
      status: 400,
      message: 'Protocolo nao aceito para consulta oficial.'
    };
  }

  if (targetUrl.username || targetUrl.password) {
    return {
      ok: false,
      status: 400,
      message: 'URL oficial invalida para consulta.'
    };
  }

  if (!isAllowedHost(targetUrl.hostname)) {
    return {
      ok: false,
      status: 403,
      message: 'Destino oficial nao autorizado para consulta.'
    };
  }

  return {
    ok: true,
    targetUrl
  };
}

export function buildLegislativeProxyCacheKey(targetUrl: URL) {
  return new Request(targetUrl.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });
}

function buildUpstreamRequestInit(): RequestInit {
  return {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  };
}

function buildProxiedResponse(upstreamResponse: Response) {
  const headers = new Headers(upstreamResponse.headers);

  if (upstreamResponse.ok) {
    headers.set(
      'Cache-Control',
      `public, max-age=0, s-maxage=${LEGISLATIVE_PROXY_CACHE_TTL_SECONDS}`
    );
    headers.set('CDN-Cache-Control', `public, max-age=${LEGISLATIVE_PROXY_CACHE_TTL_SECONDS}`);
  } else {
    headers.set('Cache-Control', 'no-store');
    headers.delete('CDN-Cache-Control');
  }

  headers.set('Vary', 'Accept');
  appendCorsHeaders(headers);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers
  });
}

function withCorsHeaders(response: Response) {
  const headers = new Headers(response.headers);

  appendCorsHeaders(headers);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function getDefaultCloudflareCache(): LegislativeProxyCache | undefined {
  if (typeof caches === 'undefined') {
    return undefined;
  }

  return (caches as unknown as { default?: LegislativeProxyCache }).default;
}

async function storeTemporaryCache(
  cache: LegislativeProxyCache,
  cacheKey: Request,
  response: Response,
  waitUntil?: (promise: Promise<unknown>) => void
) {
  const cacheWrite = cache.put(cacheKey, response.clone());

  if (waitUntil) {
    waitUntil(cacheWrite);
    return;
  }

  await cacheWrite;
}

export async function handleLegislativeProxyRequest(
  request: Request,
  options: LegislativeProxyHandlerOptions = {}
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  if (request.method !== 'GET') {
    return createJsonResponse(405, 'Metodo nao aceito para consulta oficial.');
  }

  const targetValidation = validateLegislativeProxyTarget(request);

  if (!targetValidation.ok) {
    return createJsonResponse(targetValidation.status, targetValidation.message);
  }

  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const cache = options.cache ?? getDefaultCloudflareCache();
  const cacheKey = buildLegislativeProxyCacheKey(targetValidation.targetUrl);

  if (cache) {
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return withCorsHeaders(cachedResponse);
    }
  }

  const upstreamResponse = await fetcher(
    targetValidation.targetUrl.toString(),
    buildUpstreamRequestInit()
  );
  const response = buildProxiedResponse(upstreamResponse);

  if (cache && response.ok) {
    await storeTemporaryCache(cache, cacheKey, response, options.waitUntil);
  }

  return response;
}

export default {
  async fetch(
    request: Request,
    _env: unknown,
    context?: LegislativeProxyExecutionContext
  ): Promise<Response> {
    return handleLegislativeProxyRequest(request, {
      waitUntil: context?.waitUntil.bind(context)
    });
  }
};
