export function normalizeString(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized ? normalized : undefined;
}

export function normalizeNumber(value: string | number | null | undefined): number | undefined {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeDate(value: string | number | null | undefined): string | undefined {
  const normalized = normalizeString(value);

  if (!normalized) {
    return undefined;
  }

  const dateMatch = normalized.match(/^\d{4}-\d{2}-\d{2}/);

  return dateMatch ? dateMatch[0] : normalized;
}

export function normalizeComparisonToken(
  value: string | number | null | undefined
): string | undefined {
  return normalizeString(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}
