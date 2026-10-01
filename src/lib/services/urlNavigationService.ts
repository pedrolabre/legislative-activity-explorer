import {
  findFactualSummaryCatalogEntry,
  formatLegislativeIdentifier
} from '$lib/data/factualSummaryCatalog';

export interface NavigationSearchParams {
  q?: string;
  prop?: string;
  parl?: string;
}

export type DeepLinkAction =
  | { type: 'proposal'; proposalId: string; rawQuery?: string }
  | { type: 'parliamentarian'; parliamentarianId: string; rawQuery?: string }
  | { type: 'search'; query: string }
  | { type: 'none' };

export interface ApplyDeepLinkOptions {
  searchFn?: (query: string) => Promise<void>;
  selectProposalFn?: (id: string) => Promise<boolean>;
  selectParliamentarianFn?: (id: string) => Promise<boolean>;
  getCurrentState?: () => string;
}

export interface ApplyDeepLinkResult {
  executed: boolean;
  action: DeepLinkAction;
  resolvedQuery?: string;
}

const legislativeNotationPattern = /^([a-zA-Z]{2,5})[- /]+(\d+)(?:[- /]+(\d{4}))?$/;

function stripControlCharacters(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    // Remove caracteres de controle ASCII (0-31 e 127)
    if ((code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13) {
      result += str[i];
    }
  }
  return result;
}

/**
 * Sanitiza valores de busca textual contra tags HTML, caracteres de controle e excesso de tamanho.
 */
export function sanitizeQueryText(
  value: string | null | undefined,
  maxLength = 300
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const cleaned = stripControlCharacters(String(value))
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(0, maxLength);
}

/**
 * Sanitiza identificadores (proposição ou parlamentar) contra tags HTML e caracteres de controle.
 */
export function sanitizeIdentifierText(
  value: string | null | undefined,
  maxLength = 100
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const cleaned = stripControlCharacters(String(value))
    .replace(/<[^>]*>/g, '')
    .trim();

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(0, maxLength);
}

/**
 * Converte diferentes tipos de entrada (string de URL, query string, URL, URLSearchParams)
 * em uma instância limpa de URLSearchParams.
 */
function toUrlSearchParams(
  input: string | URLSearchParams | URL | Location | undefined | null
): URLSearchParams {
  if (!input) {
    return new URLSearchParams();
  }

  if (input instanceof URLSearchParams) {
    return input;
  }

  if (typeof URL !== 'undefined' && input instanceof URL) {
    return input.searchParams;
  }

  if (typeof input === 'object' && 'search' in input && typeof input.search === 'string') {
    return new URLSearchParams(input.search);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        return new URL(trimmed).searchParams;
      } catch {
        return new URLSearchParams();
      }
    }

    const searchPart = trimmed.includes('?') ? trimmed.slice(trimmed.indexOf('?')) : trimmed;
    return new URLSearchParams(searchPart);
  }

  return new URLSearchParams();
}

/**
 * Realiza o parsing e sanitização defensiva dos parâmetros de busca da URL.
 * Parâmetros desconhecidos ou vazios são descartados deterministicamente.
 */
export function parseNavigationSearchParams(
  input: string | URLSearchParams | URL | Location | undefined | null
): NavigationSearchParams {
  const searchParams = toUrlSearchParams(input);
  const result: NavigationSearchParams = {};

  const rawQ = searchParams.get('q');
  const sanitizedQ = sanitizeQueryText(rawQ, 300);
  if (sanitizedQ) {
    result.q = sanitizedQ;
  }

  const rawProp = searchParams.get('prop');
  const sanitizedProp = sanitizeIdentifierText(rawProp, 100);
  if (sanitizedProp) {
    result.prop = sanitizedProp;
  }

  const rawParl = searchParams.get('parl');
  const sanitizedParl = sanitizeIdentifierText(rawParl, 150);
  if (sanitizedParl) {
    result.parl = sanitizedParl;
  }

  return result;
}

/**
 * Serializa os parâmetros de navegação em uma query string padronizada (?q=...&prop=...).
 * Retorna string vazia se nenhum parâmetro estiver presente.
 */
export function buildSearchQueryString(params: NavigationSearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.q) {
    const sanitized = sanitizeQueryText(params.q);
    if (sanitized) {
      searchParams.set('q', sanitized);
    }
  }

  if (params.prop) {
    const sanitized = sanitizeIdentifierText(params.prop);
    if (sanitized) {
      searchParams.set('prop', sanitized);
    }
  }

  if (params.parl) {
    const sanitized = sanitizeIdentifierText(params.parl, 150);
    if (sanitized) {
      searchParams.set('parl', sanitized);
    }
  }

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
}

/**
 * Constrói uma URL compartilhável combinando a base informada com a query string serializada.
 */
export function buildShareableUrl(params: NavigationSearchParams, baseUrl = ''): string {
  const queryString = buildSearchQueryString(params);

  if (!queryString) {
    return baseUrl;
  }

  if (!baseUrl) {
    return queryString;
  }

  const cleanBase = baseUrl.split('?')[0];
  return `${cleanBase}${queryString}`;
}

/**
 * Determina a ação correspondente aos parâmetros com base nas regras de precedência:
 * 1. prop (abertura direta de proposição)
 * 2. parl (abertura ou consulta direta de parlamentar)
 * 3. q (busca textual geral)
 * 4. none (nenhuma ação requerida)
 */
export function resolveDeepLinkAction(params: NavigationSearchParams): DeepLinkAction {
  if (params.prop) {
    return {
      type: 'proposal',
      proposalId: params.prop,
      rawQuery: params.q
    };
  }

  if (params.parl) {
    return {
      type: 'parliamentarian',
      parliamentarianId: params.parl,
      rawQuery: params.q
    };
  }

  if (params.q) {
    return {
      type: 'search',
      query: params.q
    };
  }

  return { type: 'none' };
}

/**
 * Resolve identificadores de proposição (notações, slugs ou IDs de Casa)
 * para termos pesquisáveis oficiais compreendidos pelo serviço de busca.
 */
export function resolveProposalQuery(proposalId: string): string {
  const trimmed = proposalId.trim();

  // 1. Notação ou slug com formato legislativo (ex: PL 1234/2024, pl-1234-2024, PEC-45-2023)
  const notationMatch = trimmed.match(legislativeNotationPattern);
  if (notationMatch) {
    const [, type, number, year] = notationMatch;
    const formatted = formatLegislativeIdentifier(type, number, year);
    if (formatted) {
      return formatted;
    }
  }

  // 2. Busca no catálogo factual por aliases com notação legislativa auditada
  const catalogEntry = findFactualSummaryCatalogEntry(trimmed);
  if (catalogEntry?.aliases) {
    for (const alias of catalogEntry.aliases) {
      const aliasMatch = alias.match(legislativeNotationPattern);
      if (aliasMatch) {
        const [, type, number, year] = aliasMatch;
        const formatted = formatLegislativeIdentifier(type, number, year);
        if (formatted) {
          return formatted;
        }
      }
    }
  }

  return trimmed;
}

/**
 * Aplica o deep-linking de forma determinística, idempotente e resiliente.
 */
export async function applyDeepLink(
  input: string | URLSearchParams | URL | Location | NavigationSearchParams | undefined | null,
  options: ApplyDeepLinkOptions = {}
): Promise<ApplyDeepLinkResult> {
  const currentState = options.getCurrentState?.();
  if (currentState && currentState !== 'WELCOME') {
    return {
      executed: false,
      action: { type: 'none' }
    };
  }

  const params =
    typeof input === 'object' && input !== null && !('search' in input) && !(input instanceof URLSearchParams) && !(typeof URL !== 'undefined' && input instanceof URL)
      ? (input as NavigationSearchParams)
      : parseNavigationSearchParams(input);

  const action = resolveDeepLinkAction(params);

  if (action.type === 'none') {
    return {
      executed: false,
      action
    };
  }

  try {
    if (action.type === 'proposal') {
      if (options.selectProposalFn) {
        const selected = await options.selectProposalFn(action.proposalId);
        if (selected) {
          return {
            executed: true,
            action
          };
        }
      }

      const resolvedQuery = resolveProposalQuery(action.proposalId);
      if (options.searchFn) {
        await options.searchFn(resolvedQuery);
      }

      return {
        executed: true,
        action,
        resolvedQuery
      };
    }

    if (action.type === 'parliamentarian') {
      if (options.selectParliamentarianFn) {
        const selected = await options.selectParliamentarianFn(action.parliamentarianId);
        if (selected) {
          return {
            executed: true,
            action
          };
        }
      }

      const resolvedQuery = action.rawQuery || action.parliamentarianId;
      if (options.searchFn) {
        await options.searchFn(resolvedQuery);
      }

      return {
        executed: true,
        action,
        resolvedQuery
      };
    }

    if (action.type === 'search') {
      if (options.searchFn) {
        await options.searchFn(action.query);
      }

      return {
        executed: true,
        action,
        resolvedQuery: action.query
      };
    }
  } catch {
    return {
      executed: false,
      action
    };
  }

  return {
    executed: false,
    action
  };
}
