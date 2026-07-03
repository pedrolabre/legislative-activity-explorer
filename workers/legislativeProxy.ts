import {
  LEGISLATIVE_OFFICIAL_ALLOWED_HOSTS,
  validateOfficialApiTargetUrl
} from '../src/lib/api/officialApiConfig';

export const LEGISLATIVE_PROXY_QUERY_PARAM = 'url';
export const LEGISLATIVE_PROXY_CACHE_TTL_SECONDS = 300;
export const LEGISLATIVE_PROXY_ALLOWED_HOSTS = LEGISLATIVE_OFFICIAL_ALLOWED_HOSTS;
export const LEGISLATIVE_PROXY_ALLOWED_ORIGINS_ENV = 'LEGISLATIVE_PROXY_ALLOWED_ORIGINS';

export type LegislativeProxyAllowedHost = (typeof LEGISLATIVE_PROXY_ALLOWED_HOSTS)[number];
export type LegislativeProxyFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface LegislativeProxyCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface LegislativeProxyExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface LegislativeProxyEnv {
  LEGISLATIVE_PROXY_ALLOWED_ORIGINS?: string;
}

export interface LegislativeProxyHandlerOptions {
  allowedOrigins?: string[];
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
      kind: string;
      message: string;
    };

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type, Origin',
  'Access-Control-Max-Age': '86400'
} as const;

function getRequestOrigin(request: Request) {
  return request.headers.get('Origin')?.trim() ?? '';
}

function isAllowedCorsOrigin(request: Request, allowedOrigins: string[] = []) {
  const origin = getRequestOrigin(request);

  if (!origin) {
    return true;
  }

  if (origin === new URL(request.url).origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function appendCorsHeaders(headers: Headers, request: Request, allowedOrigins: string[] = []) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }

  const origin = getRequestOrigin(request);

  if (origin && isAllowedCorsOrigin(request, allowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.append('Vary', 'Origin');
  }

  return headers;
}

function createJsonResponse(
  status: number,
  kind: string,
  message: string,
  request: Request,
  allowedOrigins: string[] = []
) {
  const headers = appendCorsHeaders(
    new Headers({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }),
    request,
    allowedOrigins
  );

  return new Response(JSON.stringify({ error: message, kind }), {
    status,
    headers
  });
}

function createOptionsResponse(request: Request, allowedOrigins: string[] = []) {
  if (!isAllowedCorsOrigin(request, allowedOrigins)) {
    return createJsonResponse(
      403,
      'cors-origin-not-allowed',
      'Origem nao autorizada para consultar o proxy legislativo.',
      request,
      allowedOrigins
    );
  }

  return new Response(null, {
    status: 204,
    headers: appendCorsHeaders(new Headers(), request, allowedOrigins)
  });
}

export function validateLegislativeProxyTarget(request: Request): TargetValidationResult {
  const requestUrl = new URL(request.url);
  const rawTargetUrl = requestUrl.searchParams.get(LEGISLATIVE_PROXY_QUERY_PARAM)?.trim();

  if (!rawTargetUrl) {
    return {
      ok: false,
      status: 400,
      kind: 'missing-target-url',
      message: 'URL oficial nao informada para consulta.'
    };
  }

  const validation = validateOfficialApiTargetUrl(rawTargetUrl);

  if (!validation.ok && validation.issue === 'invalid-url') {
    return {
      ok: false,
      status: 400,
      kind: 'invalid-target-url',
      message: 'URL oficial invalida para consulta.'
    };
  }

  if (!validation.ok && validation.issue === 'unsupported-protocol') {
    return {
      ok: false,
      status: 400,
      kind: 'unsupported-target-protocol',
      message: 'Protocolo nao aceito para consulta oficial.'
    };
  }

  if (!validation.ok && validation.issue === 'url-with-credentials') {
    return {
      ok: false,
      status: 400,
      kind: 'target-url-with-credentials',
      message: 'URL oficial invalida para consulta.'
    };
  }

  if (!validation.ok && validation.issue === 'disallowed-host') {
    return {
      ok: false,
      status: 403,
      kind: 'disallowed-target-host',
      message: 'Destino oficial nao autorizado para consulta.'
    };
  }

  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      kind: 'invalid-target-url',
      message: 'URL oficial invalida para consulta.'
    };
  }

  return {
    ok: true,
    targetUrl: validation.targetUrl
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

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers
  });
}

function withCorsHeaders(response: Response, request: Request, allowedOrigins: string[] = []) {
  const headers = new Headers(response.headers);

  appendCorsHeaders(headers, request, allowedOrigins);

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

function isCacheableOfficialContentType(response: Response) {
  const contentType = response.headers.get('Content-Type')?.toLocaleLowerCase('en-US') ?? '';

  return (
    contentType.includes('application/json') ||
    contentType.includes('+json') ||
    contentType.includes('text/json')
  );
}

function parseAllowedOrigins(rawOrigins: string | undefined) {
  return (rawOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
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
  const allowedOrigins = options.allowedOrigins ?? [];

  if (request.method === 'OPTIONS') {
    return createOptionsResponse(request, allowedOrigins);
  }

  if (request.method !== 'GET') {
    return createJsonResponse(
      405,
      'method-not-allowed',
      'Metodo nao aceito para consulta oficial.',
      request,
      allowedOrigins
    );
  }

  if (!isAllowedCorsOrigin(request, allowedOrigins)) {
    return createJsonResponse(
      403,
      'cors-origin-not-allowed',
      'Origem nao autorizada para consultar o proxy legislativo.',
      request,
      allowedOrigins
    );
  }

  const targetValidation = validateLegislativeProxyTarget(request);

  if (!targetValidation.ok) {
    return createJsonResponse(
      targetValidation.status,
      targetValidation.kind,
      targetValidation.message,
      request,
      allowedOrigins
    );
  }

  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const cache = options.cache ?? getDefaultCloudflareCache();
  const cacheKey = buildLegislativeProxyCacheKey(targetValidation.targetUrl);

  if (cache) {
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      return withCorsHeaders(cachedResponse, request, allowedOrigins);
    }
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetcher(
      targetValidation.targetUrl.toString(),
      buildUpstreamRequestInit()
    );
  } catch {
    return createJsonResponse(
      502,
      'upstream-network-error',
      'A fonte oficial nao pode ser consultada neste momento.',
      request,
      allowedOrigins
    );
  }

  const response = buildProxiedResponse(upstreamResponse);

  if (cache && response.ok && isCacheableOfficialContentType(response)) {
    await storeTemporaryCache(cache, cacheKey, response, options.waitUntil);
  }

  return withCorsHeaders(response, request, allowedOrigins);
}

export default {
  async fetch(
    request: Request,
    env: LegislativeProxyEnv,
    context?: LegislativeProxyExecutionContext
  ): Promise<Response> {
    return handleLegislativeProxyRequest(request, {
      allowedOrigins: parseAllowedOrigins(env?.LEGISLATIVE_PROXY_ALLOWED_ORIGINS),
      waitUntil: context?.waitUntil.bind(context)
    });
  }
};
