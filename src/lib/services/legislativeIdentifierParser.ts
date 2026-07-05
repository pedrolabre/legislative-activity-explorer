export const nationalLegislativeIdentifierTypes = [
  'PEC',
  'PLP',
  'PDC',
  'PDL',
  'MPV',
  'REQ',
  'RQS',
  'RQN',
  'MSC',
  'PLS',
  'PLC',
  'PLV',
  'PRS',
  'PDS',
  'PRC',
  'PL'
] as const;

export type NationalLegislativeIdentifierType =
  (typeof nationalLegislativeIdentifierTypes)[number];

export type LegislativeIdentifierParseFailureReason =
  | 'not-an-identifier'
  | 'unsupported-type'
  | 'malformed-identifier';

export interface NationalLegislativeIdentifier {
  type: NationalLegislativeIdentifierType;
  number: string;
  year?: number;
  label: string;
}

export type LegislativeIdentifierParseResult =
  | {
      ok: true;
      identifier: NationalLegislativeIdentifier;
    }
  | {
      ok: false;
      attempted: boolean;
      reason: LegislativeIdentifierParseFailureReason;
      message: string;
    };

const typeAlternation = nationalLegislativeIdentifierTypes.join('|');
const legislativeIdentifierPattern = new RegExp(
  `^(${typeAlternation})(?:\\s*[- ]?\\s*)(\\d{1,6})(?:\\s*\\/\\s*(\\d{4}))?$`,
  'i'
);
const directIdentifierAttemptPattern = /^([A-Za-z]{2,5})(?:\s*[- ]?\s*)\d/i;
const typeAndNumberPattern = /^([A-Za-z]{2,5})(?:\s*[- ]?\s*)(\d+)/i;

function normalizeProposalNumber(value: string | undefined) {
  const normalized = value?.trim().replace(/^0+(?=\d)/, '');

  return normalized || undefined;
}

function isSupportedType(value: string): value is NationalLegislativeIdentifierType {
  return nationalLegislativeIdentifierTypes.includes(
    value.toLocaleUpperCase('pt-BR') as NationalLegislativeIdentifierType
  );
}

function createFailure(
  attempted: boolean,
  reason: LegislativeIdentifierParseFailureReason,
  message: string
): LegislativeIdentifierParseResult {
  return {
    ok: false,
    attempted,
    reason,
    message
  };
}

export function parseLegislativeIdentifier(query: string): LegislativeIdentifierParseResult {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return createFailure(false, 'not-an-identifier', '');
  }

  const match = normalizedQuery.match(legislativeIdentifierPattern);

  if (match) {
    const type = match[1].toLocaleUpperCase('pt-BR');
    const number = normalizeProposalNumber(match[2]);
    const year = match[3] ? Number(match[3]) : undefined;

    if (!isSupportedType(type) || !number || number === '0' || !Number.isInteger(year ?? 0)) {
      return createFailure(
        true,
        'malformed-identifier',
        'Identificador legislativo incompleto. Informe tipo, número e, quando usar ano, quatro dígitos.'
      );
    }

    return {
      ok: true,
      identifier: {
        type,
        number,
        year,
        label: year ? `${type} ${number}/${year}` : `${type} ${number}`
      }
    };
  }

  const attemptedIdentifierMatch = normalizedQuery.match(typeAndNumberPattern);

  if (attemptedIdentifierMatch) {
    const attemptedType = attemptedIdentifierMatch[1].toLocaleUpperCase('pt-BR');

    if (!isSupportedType(attemptedType)) {
      return createFailure(
        true,
        'unsupported-type',
        `Tipo legislativo ${attemptedType} não está no parser nacional desta versão.`
      );
    }
  }

  if (directIdentifierAttemptPattern.test(normalizedQuery)) {
    return createFailure(
      true,
      'malformed-identifier',
      'Identificador legislativo incompleto. Use formatos como PL 2630/2020, PL-2630 ou PEC 45.'
    );
  }

  return createFailure(false, 'not-an-identifier', '');
}

export function parseDirectProposalQuery(query: string): NationalLegislativeIdentifier | null {
  const result = parseLegislativeIdentifier(query);

  return result.ok ? result.identifier : null;
}
