export const OFFICIAL_API_DEFAULT_TIMEOUT_MS = 10000;

export const LEGISLATIVE_OFFICIAL_ALLOWED_HOSTS = [
  'dadosabertos.camara.leg.br',
  'legis.senado.leg.br'
] as const;

export type LegislativeOfficialAllowedHost =
  (typeof LEGISLATIVE_OFFICIAL_ALLOWED_HOSTS)[number];

export type OfficialApiTargetUrlIssue =
  | 'invalid-url'
  | 'unsupported-protocol'
  | 'url-with-credentials'
  | 'disallowed-host';

export type OfficialApiTargetUrlValidation =
  | {
      ok: true;
      targetUrl: URL;
    }
  | {
      ok: false;
      issue: OfficialApiTargetUrlIssue;
    };

export function isHttpsProtocol(protocol: string) {
  return protocol === 'https:';
}

export function isAllowedOfficialHost(
  hostname: string
): hostname is LegislativeOfficialAllowedHost {
  const normalizedHostname = hostname.toLowerCase();

  return LEGISLATIVE_OFFICIAL_ALLOWED_HOSTS.some(
    (allowedHost) => allowedHost === normalizedHostname
  );
}

export function validateOfficialApiTargetUrl(
  rawTargetUrl: string
): OfficialApiTargetUrlValidation {
  let targetUrl: URL;

  try {
    targetUrl = new URL(rawTargetUrl);
  } catch {
    return {
      ok: false,
      issue: 'invalid-url'
    };
  }

  if (!isHttpsProtocol(targetUrl.protocol)) {
    return {
      ok: false,
      issue: 'unsupported-protocol'
    };
  }

  if (targetUrl.username || targetUrl.password) {
    return {
      ok: false,
      issue: 'url-with-credentials'
    };
  }

  if (!isAllowedOfficialHost(targetUrl.hostname)) {
    return {
      ok: false,
      issue: 'disallowed-host'
    };
  }

  return {
    ok: true,
    targetUrl
  };
}

export function isAllowedOfficialApiTargetUrl(targetUrl: string) {
  return validateOfficialApiTargetUrl(targetUrl).ok;
}
