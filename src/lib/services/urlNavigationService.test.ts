import { describe, expect, it, vi } from 'vitest';
import {
  applyDeepLink,
  areNavigationParamsEqual,
  buildSearchQueryString,
  buildShareableUrl,
  computeSearchParamsFromState,
  handlePopStateNavigation,
  isSignificantNavigationState,
  isTransientNavigationState,
  parseNavigationSearchParams,
  registerPopstateListener,
  resolveDeepLinkAction,
  resolveProposalQuery,
  sanitizeIdentifierText,
  sanitizeQueryText,
  syncUrlWithState
} from './urlNavigationService';

describe('urlNavigationService', () => {
  describe('Sanitização defensiva de parâmetros', () => {
    it('sanitizeQueryText remove tags HTML, scripts e caracteres de controle', () => {
      const malicious = '<script>alert("xss")</script> educacao\x00\x1F basica ';
      const sanitized = sanitizeQueryText(malicious);

      expect(sanitized).toBe('alert("xss") educacao basica');
    });

    it('sanitizeQueryText colapsa múltiplos espaços em branco', () => {
      expect(sanitizeQueryText('  politica    publica   ')).toBe('politica publica');
    });

    it('sanitizeQueryText retorna undefined para valores nulos, vazios ou apenas espaços', () => {
      expect(sanitizeQueryText(null)).toBeUndefined();
      expect(sanitizeQueryText(undefined)).toBeUndefined();
      expect(sanitizeQueryText('')).toBeUndefined();
      expect(sanitizeQueryText('   ')).toBeUndefined();
      expect(sanitizeQueryText('<script></script>')).toBeUndefined();
    });

    it('sanitizeQueryText trunca strings que excedem o tamanho máximo permitido', () => {
      const longText = 'a'.repeat(400);
      const sanitized = sanitizeQueryText(longText, 300);

      expect(sanitized?.length).toBe(300);
      expect(sanitized).toBe('a'.repeat(300));
    });

    it('sanitizeIdentifierText remove tags HTML e caracteres de controle', () => {
      const malicious = '<b>camara-proposicao-1234</b>\x07';
      expect(sanitizeIdentifierText(malicious)).toBe('camara-proposicao-1234');
    });

    it('sanitizeIdentifierText trunca identificadores que excedem o limite', () => {
      const longId = 'id-'.repeat(50);
      const sanitized = sanitizeIdentifierText(longId, 100);

      expect(sanitized?.length).toBe(100);
    });

    it('sanitizeIdentifierText retorna undefined para valores vazios ou inválidos', () => {
      expect(sanitizeIdentifierText(null)).toBeUndefined();
      expect(sanitizeIdentifierText(undefined)).toBeUndefined();
      expect(sanitizeIdentifierText('')).toBeUndefined();
      expect(sanitizeIdentifierText('   ')).toBeUndefined();
    });
  });

  describe('Parsing de parâmetros de busca (parseNavigationSearchParams)', () => {
    it('extrai parâmetro q a partir de uma query string simples', () => {
      const result = parseNavigationSearchParams('?q=educacao');
      expect(result).toEqual({ q: 'educacao' });
    });

    it('extrai parâmetro prop a partir de uma query string', () => {
      const result = parseNavigationSearchParams('?prop=camara-proposicao-1234');
      expect(result).toEqual({ prop: 'camara-proposicao-1234' });
    });

    it('extrai parâmetro parl a partir de uma query string', () => {
      const result = parseNavigationSearchParams('?parl=camara-deputado-74400');
      expect(result).toEqual({ parl: 'camara-deputado-74400' });
    });

    it('extrai múltiplos parâmetros válidos combinados', () => {
      const result = parseNavigationSearchParams(
        '?q=reforma&prop=PEC 45/2023&parl=senado-senador-5982'
      );
      expect(result).toEqual({
        q: 'reforma',
        prop: 'PEC 45/2023',
        parl: 'senado-senador-5982'
      });
    });

    it('ignora parâmetros desconhecidos como utm_source ou ref', () => {
      const result = parseNavigationSearchParams(
        '?q=saude&utm_source=twitter&ref=share&tracking_id=123'
      );
      expect(result).toEqual({ q: 'saude' });
    });

    it('suporta parsing a partir de URL completa HTTP/HTTPS', () => {
      const result = parseNavigationSearchParams(
        'https://parlamentar.leg.br/busca?q=transporte&prop=PL 100/2024'
      );
      expect(result).toEqual({
        q: 'transporte',
        prop: 'PL 100/2024'
      });
    });

    it('suporta parsing a partir de objeto URL ou URLSearchParams', () => {
      const url = new URL('http://localhost:5173/?q=tecnologia');
      const fromUrl = parseNavigationSearchParams(url);
      expect(fromUrl).toEqual({ q: 'tecnologia' });

      const searchParams = new URLSearchParams('prop=pl-1234-2024');
      const fromParams = parseNavigationSearchParams(searchParams);
      expect(fromParams).toEqual({ prop: 'pl-1234-2024' });
    });

    it('suporta parsing a partir de objeto com propriedade search (tipo Location)', () => {
      const mockLocation = { search: '?q=meio+ambiente' } as Location;
      const result = parseNavigationSearchParams(mockLocation);
      expect(result).toEqual({ q: 'meio ambiente' });
    });

    it('retorna objeto vazio para entradas vazias, nulas ou sem parâmetros conhecidos', () => {
      expect(parseNavigationSearchParams('')).toEqual({});
      expect(parseNavigationSearchParams(null)).toEqual({});
      expect(parseNavigationSearchParams(undefined)).toEqual({});
      expect(parseNavigationSearchParams('?unknown=true')).toEqual({});
      expect(parseNavigationSearchParams('?q=&prop=&parl=')).toEqual({});
      expect(parseNavigationSearchParams('?q=%20%20')).toEqual({});
    });

    it('aplica sanitização contra XSS nos parâmetros extraídos', () => {
      const result = parseNavigationSearchParams(
        '?q=<script>alert("xss")</script>seguranca&prop=<b>pl-123</b>'
      );
      expect(result).toEqual({
        q: 'alert("xss")seguranca',
        prop: 'pl-123'
      });
    });
  });

  describe('Serialização e construção de URLs', () => {
    it('buildSearchQueryString gera query string para parâmetro único q', () => {
      expect(buildSearchQueryString({ q: 'educacao' })).toBe('?q=educacao');
    });

    it('buildSearchQueryString gera query string com codificação adequada', () => {
      expect(buildSearchQueryString({ prop: 'PL 1234/2024' })).toBe(
        '?prop=PL+1234%2F2024'
      );
    });

    it('buildSearchQueryString gera query string para múltiplos parâmetros', () => {
      const query = buildSearchQueryString({
        q: 'educacao',
        prop: 'PL 10/2024',
        parl: 'camara-1'
      });
      expect(query).toBe('?q=educacao&prop=PL+10%2F2024&parl=camara-1');
    });

    it('buildSearchQueryString retorna string vazia quando não há parâmetros', () => {
      expect(buildSearchQueryString({})).toBe('');
      expect(buildSearchQueryString({ q: '', prop: '   ' })).toBe('');
    });

    it('buildShareableUrl combina base URL e parâmetros codificados', () => {
      const url = buildShareableUrl(
        { q: 'saude' },
        'https://parlamentar.leg.br/'
      );
      expect(url).toBe('https://parlamentar.leg.br/?q=saude');
    });

    it('buildShareableUrl preserva caminho base e substitui query string existente', () => {
      const url = buildShareableUrl(
        { prop: 'pl-1234-2024' },
        'https://parlamentar.leg.br/explorar?old=1'
      );
      expect(url).toBe('https://parlamentar.leg.br/explorar?prop=pl-1234-2024');
    });

    it('buildShareableUrl retorna apenas query string se baseUrl não for fornecida', () => {
      expect(buildShareableUrl({ q: 'educacao' })).toBe('?q=educacao');
      expect(buildShareableUrl({})).toBe('');
    });
  });

  describe('Precedência e resolução de ação (resolveDeepLinkAction)', () => {
    it('atribui prioridade máxima para proposição quando prop está presente', () => {
      const action = resolveDeepLinkAction({
        prop: 'camara-proposicao-1234',
        q: 'educacao',
        parl: 'deputado-1'
      });

      expect(action).toEqual({
        type: 'proposal',
        proposalId: 'camara-proposicao-1234',
        rawQuery: 'educacao'
      });
    });

    it('atribui prioridade a parlamentar quando parl e q estão presentes sem prop', () => {
      const action = resolveDeepLinkAction({
        parl: 'camara-deputado-74400',
        q: 'tabata'
      });

      expect(action).toEqual({
        type: 'parliamentarian',
        parliamentarianId: 'camara-deputado-74400',
        rawQuery: 'tabata'
      });
    });

    it('resolve ação de busca quando apenas q está presente', () => {
      const action = resolveDeepLinkAction({ q: 'reforma tributaria' });

      expect(action).toEqual({
        type: 'search',
        query: 'reforma tributaria'
      });
    });

    it('retorna ação none para parâmetros vazios', () => {
      expect(resolveDeepLinkAction({})).toEqual({ type: 'none' });
    });
  });

  describe('Resolução de proposições (resolveProposalQuery)', () => {
    it('formata notação legislativa direta com barra e ano', () => {
      expect(resolveProposalQuery('PL 1234/2024')).toBe('PL 1234/2024');
      expect(resolveProposalQuery('pl 1234/2024')).toBe('PL 1234/2024');
    });

    it('formata slug canônico com hífen para notação canônica com barra', () => {
      expect(resolveProposalQuery('pl-1234-2024')).toBe('PL 1234/2024');
      expect(resolveProposalQuery('pec-45-2023')).toBe('PEC 45/2023');
    });

    it('resolve alias do catálogo factual para notação oficial auditada', () => {
      expect(resolveProposalQuery('camara-proposicao-1234')).toBe('PL 1234/2024');
      expect(resolveProposalQuery('senado-materia-45')).toBe('PEC 45/2023');
      expect(resolveProposalQuery('bill-pl-1234-2024')).toBe('PL 1234/2024');
    });

    it('mantém identificador não catalogado inalterado como fallback de busca', () => {
      expect(resolveProposalQuery('camara-proposicao-9999')).toBe('camara-proposicao-9999');
      expect(resolveProposalQuery('projeto-desconhecido')).toBe('projeto-desconhecido');
    });
  });

  describe('Execução do deep-linking (applyDeepLink)', () => {
    it('executa busca direta quando ação é search', async () => {
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('?q=educacao', { searchFn });

      expect(result.executed).toBe(true);
      expect(result.action).toEqual({ type: 'search', query: 'educacao' });
      expect(result.resolvedQuery).toBe('educacao');
      expect(searchFn).toHaveBeenCalledWith('educacao');
    });

    it('seleciona proposição diretamente se selectProposalFn tiver sucesso', async () => {
      const selectProposalFn = vi.fn().mockResolvedValue(true);
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('?prop=PL 1234/2024', {
        selectProposalFn,
        searchFn
      });

      expect(result.executed).toBe(true);
      expect(result.action.type).toBe('proposal');
      expect(selectProposalFn).toHaveBeenCalledWith('PL 1234/2024');
      expect(searchFn).not.toHaveBeenCalled();
    });

    it('recorre ao searchFn com notação resolvida se selectProposalFn não encontrar', async () => {
      const selectProposalFn = vi.fn().mockResolvedValue(false);
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('?prop=pl-1234-2024', {
        selectProposalFn,
        searchFn
      });

      expect(result.executed).toBe(true);
      expect(result.action.type).toBe('proposal');
      expect(result.resolvedQuery).toBe('PL 1234/2024');
      expect(searchFn).toHaveBeenCalledWith('PL 1234/2024');
    });

    it('seleciona parlamentar diretamente se selectParliamentarianFn tiver sucesso', async () => {
      const selectParliamentarianFn = vi.fn().mockResolvedValue(true);
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('?parl=camara-deputado-74400', {
        selectParliamentarianFn,
        searchFn
      });

      expect(result.executed).toBe(true);
      expect(result.action.type).toBe('parliamentarian');
      expect(selectParliamentarianFn).toHaveBeenCalledWith('camara-deputado-74400');
      expect(searchFn).not.toHaveBeenCalled();
    });

    it('recorre ao searchFn se selectParliamentarianFn retornar false', async () => {
      const selectParliamentarianFn = vi.fn().mockResolvedValue(false);
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('?parl=Tabata Amaral', {
        selectParliamentarianFn,
        searchFn
      });

      expect(result.executed).toBe(true);
      expect(result.action.type).toBe('parliamentarian');
      expect(result.resolvedQuery).toBe('Tabata Amaral');
      expect(searchFn).toHaveBeenCalledWith('Tabata Amaral');
    });

    it('não executa se o estado atual não for WELCOME (proteção contra concorrência)', async () => {
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('?q=educacao', {
        searchFn,
        getCurrentState: () => 'SEARCH_RESULTS'
      });

      expect(result.executed).toBe(false);
      expect(result.action).toEqual({ type: 'none' });
      expect(searchFn).not.toHaveBeenCalled();
    });

    it('retorna executed: false para query string vazia ou inválida', async () => {
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('', { searchFn });

      expect(result.executed).toBe(false);
      expect(result.action).toEqual({ type: 'none' });
      expect(searchFn).not.toHaveBeenCalled();
    });

    it('executa deep link mesmo em estado não-WELCOME quando force é true', async () => {
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await applyDeepLink('?q=saude', {
        searchFn,
        getCurrentState: () => 'SEARCH_RESULTS',
        force: true
      });

      expect(result.executed).toBe(true);
      expect(searchFn).toHaveBeenCalledWith('saude');
    });

    it('executa resetFn quando a query é vazia e force é true em estado não-WELCOME', async () => {
      const resetFn = vi.fn();

      const result = await applyDeepLink('', {
        resetFn,
        getCurrentState: () => 'BILL_DETAIL',
        force: true
      });

      expect(result.executed).toBe(true);
      expect(result.action).toEqual({ type: 'none' });
      expect(resetFn).toHaveBeenCalledTimes(1);
    });

    it('não executa resetFn se o estado já for WELCOME', async () => {
      const resetFn = vi.fn();

      const result = await applyDeepLink('', {
        resetFn,
        getCurrentState: () => 'WELCOME',
        force: true
      });

      expect(result.executed).toBe(false);
      expect(resetFn).not.toHaveBeenCalled();
    });

    it('trata exceções lançadas nos callbacks defensivamente', async () => {
      const searchFn = vi.fn().mockRejectedValue(new Error('Falha de rede'));

      const result = await applyDeepLink('?q=falha', { searchFn });

      expect(result.executed).toBe(false);
    });
  });

  describe('Detecção de estados transitórios e significativos', () => {
    it('isTransientNavigationState identifica SEARCHING como transitório', () => {
      expect(isTransientNavigationState('SEARCHING')).toBe(true);
      expect(isTransientNavigationState('WELCOME')).toBe(false);
      expect(isTransientNavigationState('SEARCH_RESULTS')).toBe(false);
      expect(isTransientNavigationState('BILL_DETAIL')).toBe(false);
      expect(isTransientNavigationState(undefined)).toBe(false);
      expect(isTransientNavigationState(null)).toBe(false);
    });

    it('isSignificantNavigationState identifica estados válidos não-transitórios', () => {
      expect(isSignificantNavigationState('WELCOME')).toBe(true);
      expect(isSignificantNavigationState('SEARCH_RESULTS')).toBe(true);
      expect(isSignificantNavigationState('PARLIAMENTARIAN_DETAIL')).toBe(true);
      expect(isSignificantNavigationState('BILL_DETAIL')).toBe(true);
      expect(isSignificantNavigationState('SEARCHING')).toBe(false);
      expect(isSignificantNavigationState('')).toBe(false);
      expect(isSignificantNavigationState(null)).toBe(false);
    });
  });

  describe('Cálculo de parâmetros a partir do estado (computeSearchParamsFromState)', () => {
    it('retorna vazio para WELCOME, SEARCHING ou estados indefinidos', () => {
      expect(computeSearchParamsFromState({ currentState: 'WELCOME' })).toEqual({});
      expect(
        computeSearchParamsFromState({ currentState: 'SEARCHING', lastQuery: 'educacao' })
      ).toEqual({});
      expect(computeSearchParamsFromState({ currentState: '' })).toEqual({});
    });

    it('retorna parâmetro q para SEARCH_RESULTS com lastQuery', () => {
      const params = computeSearchParamsFromState({
        currentState: 'SEARCH_RESULTS',
        lastQuery: 'reforma tributaria'
      });
      expect(params).toEqual({ q: 'reforma tributaria' });
    });

    it('retorna parâmetros parl e q para PARLIAMENTARIAN_DETAIL, BILLS e VOTES', () => {
      const detailParams = computeSearchParamsFromState({
        currentState: 'PARLIAMENTARIAN_DETAIL',
        selectedParliamentarianId: 'camara-deputado-74400',
        lastQuery: 'tabata'
      });
      expect(detailParams).toEqual({
        parl: 'camara-deputado-74400',
        q: 'tabata'
      });

      const billsParams = computeSearchParamsFromState({
        currentState: 'PARLIAMENTARIAN_BILLS',
        selectedParliamentarianId: 'senado-senador-5982'
      });
      expect(billsParams).toEqual({
        parl: 'senado-senador-5982'
      });

      const votesParams = computeSearchParamsFromState({
        currentState: 'PARLIAMENTARIAN_VOTES',
        selectedParliamentarianId: 'senado-senador-5982',
        lastQuery: 'senador'
      });
      expect(votesParams).toEqual({
        parl: 'senado-senador-5982',
        q: 'senador'
      });
    });

    it('retorna parâmetros prop, parl e q para BILL_DETAIL e BILL_VOTES', () => {
      const billParams = computeSearchParamsFromState({
        currentState: 'BILL_DETAIL',
        selectedProposalId: 'PL 1234/2024',
        selectedParliamentarianId: 'camara-10',
        lastQuery: 'educacao'
      });
      expect(billParams).toEqual({
        prop: 'PL 1234/2024',
        parl: 'camara-10',
        q: 'educacao'
      });

      const billVotesParams = computeSearchParamsFromState({
        currentState: 'BILL_VOTES',
        selectedProposalId: 'PEC 45/2023'
      });
      expect(billVotesParams).toEqual({
        prop: 'PEC 45/2023'
      });
    });

    it('retorna query preservada para outros estados significativos como ABOUT', () => {
      const params = computeSearchParamsFromState({
        currentState: 'ABOUT',
        lastQuery: 'consulta ativa'
      });
      expect(params).toEqual({ q: 'consulta ativa' });
    });
  });

  describe('Comparação de parâmetros (areNavigationParamsEqual)', () => {
    it('reconhece parâmetros vazios como equivalentes a indefinidos', () => {
      expect(areNavigationParamsEqual({}, {})).toBe(true);
      expect(areNavigationParamsEqual({ q: '' }, {})).toBe(true);
      expect(areNavigationParamsEqual({ prop: undefined }, { prop: '' })).toBe(true);
    });

    it('reconhece parâmetros equivalentes ignorando espaços periféricos', () => {
      expect(areNavigationParamsEqual({ q: '  saude  ' }, { q: 'saude' })).toBe(true);
      expect(
        areNavigationParamsEqual(
          { q: 'educacao', prop: 'PL 10/2024' },
          { q: 'educacao', prop: 'PL 10/2024' }
        )
      ).toBe(true);
    });

    it('retorna false quando qualquer parâmetro for diferente', () => {
      expect(areNavigationParamsEqual({ q: 'saude' }, { q: 'educacao' })).toBe(false);
      expect(areNavigationParamsEqual({ prop: 'PL 1/2024' }, { prop: 'PL 2/2024' })).toBe(false);
      expect(
        areNavigationParamsEqual(
          { parl: 'camara-1' },
          { parl: 'camara-2' }
        )
      ).toBe(false);
    });
  });

  describe('Sincronização de URL via History API (syncUrlWithState)', () => {
    it('suprime sincronização de histórico durante estado transitório SEARCHING', () => {
      const mockHistory = {
        pushState: vi.fn(),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        { currentState: 'SEARCHING', lastQuery: 'educacao' },
        { history: mockHistory, location: { pathname: '/', search: '' } }
      );

      expect(result.updated).toBe(false);
      expect(result.method).toBe('none');
      expect(mockHistory.pushState).not.toHaveBeenCalled();
      expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    it('ignora sincronização quando a URL atual já contém os mesmos parâmetros (idempotência)', () => {
      const mockHistory = {
        pushState: vi.fn(),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        { currentState: 'SEARCH_RESULTS', lastQuery: 'educacao' },
        { history: mockHistory, location: { pathname: '/app', search: '?q=educacao' } }
      );

      expect(result.updated).toBe(false);
      expect(result.method).toBe('none');
      expect(result.targetUrl).toBe('/app?q=educacao');
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('usa pushState ao transicionar para novo estado de busca', () => {
      const mockHistory = {
        pushState: vi.fn(),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        { currentState: 'SEARCH_RESULTS', lastQuery: 'tecnologia' },
        { history: mockHistory, location: { pathname: '/', search: '' } }
      );

      expect(result.updated).toBe(true);
      expect(result.method).toBe('pushState');
      expect(result.targetUrl).toBe('/?q=tecnologia');
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/?q=tecnologia');
    });

    it('usa pushState ao selecionar proposição com parâmetros serializados', () => {
      const mockHistory = {
        pushState: vi.fn(),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        {
          currentState: 'BILL_DETAIL',
          selectedProposalId: 'PL 100/2024',
          lastQuery: 'saude'
        },
        { history: mockHistory, location: { pathname: '/', search: '?q=saude' } }
      );

      expect(result.updated).toBe(true);
      expect(result.method).toBe('pushState');
      expect(result.targetUrl).toBe('/?q=saude&prop=PL+100%2F2024');
      expect(mockHistory.pushState).toHaveBeenCalledWith(
        null,
        '',
        '/?q=saude&prop=PL+100%2F2024'
      );
    });

    it('usa replaceState para limpar query string ao retornar para WELCOME', () => {
      const mockHistory = {
        pushState: vi.fn(),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        { currentState: 'WELCOME' },
        { history: mockHistory, location: { pathname: '/painel', search: '?q=saude&prop=PL+10' } }
      );

      expect(result.updated).toBe(true);
      expect(result.method).toBe('replaceState');
      expect(result.targetUrl).toBe('/painel');
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/painel');
    });

    it('não executa replaceState no WELCOME se a URL já estiver limpa', () => {
      const mockHistory = {
        pushState: vi.fn(),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        { currentState: 'WELCOME' },
        { history: mockHistory, location: { pathname: '/', search: '' } }
      );

      expect(result.updated).toBe(false);
      expect(result.method).toBe('none');
      expect(mockHistory.replaceState).not.toHaveBeenCalled();
    });

    it('força replaceState quando a opção replace for explicitamente true', () => {
      const mockHistory = {
        pushState: vi.fn(),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        { currentState: 'SEARCH_RESULTS', lastQuery: 'educacao' },
        {
          history: mockHistory,
          location: { pathname: '/', search: '' },
          replace: true
        }
      );

      expect(result.updated).toBe(true);
      expect(result.method).toBe('replaceState');
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/?q=educacao');
      expect(mockHistory.pushState).not.toHaveBeenCalled();
    });

    it('retorna updated: false e method: none em ambiente sem history', () => {
      const result = syncUrlWithState(
        { currentState: 'SEARCH_RESULTS', lastQuery: 'educacao' },
        { history: undefined }
      );

      expect(result.updated).toBe(false);
      expect(result.method).toBe('none');
    });

    it('trata exceções lançadas pelo history com segurança', () => {
      const throwingHistory = {
        pushState: vi.fn().mockImplementation(() => {
          throw new Error('SecurityError: History call rejected');
        }),
        replaceState: vi.fn()
      };

      const result = syncUrlWithState(
        { currentState: 'SEARCH_RESULTS', lastQuery: 'educacao' },
        { history: throwingHistory, location: { pathname: '/', search: '' } }
      );

      expect(result.updated).toBe(false);
      expect(result.method).toBe('none');
    });
  });

  describe('Listener de popstate (registerPopstateListener)', () => {
    it('registra o listener no objeto window e remove na função de limpeza', () => {
      const mockWindow = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      const handler = vi.fn();
      const unregister = registerPopstateListener(handler, mockWindow as unknown as Window);

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('popstate', handler);

      unregister();
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('popstate', handler);
    });

    it('retorna no-op sem falhas se targetWindow for undefined ou inválido', () => {
      const unregister = registerPopstateListener(vi.fn(), undefined);
      expect(typeof unregister).toBe('function');
      expect(() => unregister()).not.toThrow();
    });
  });

  describe('Navegação orquestrada de popstate (handlePopStateNavigation)', () => {
    it('aciona os ganchos onNavigationStart e onNavigationEnd e executa busca', async () => {
      const onNavigationStart = vi.fn();
      const onNavigationEnd = vi.fn();
      const searchFn = vi.fn().mockResolvedValue(undefined);

      const result = await handlePopStateNavigation({
        location: { pathname: '/', search: '?q=meio+ambiente' },
        searchFn,
        onNavigationStart,
        onNavigationEnd
      });

      expect(onNavigationStart).toHaveBeenCalledTimes(1);
      expect(onNavigationEnd).toHaveBeenCalledTimes(1);
      expect(result.executed).toBe(true);
      expect(result.action).toEqual({ type: 'search', query: 'meio ambiente' });
      expect(searchFn).toHaveBeenCalledWith('meio ambiente');
    });

    it('aciona resetFn quando o usuário navega de volta para a raiz limpa', async () => {
      const resetFn = vi.fn();
      const onNavigationStart = vi.fn();
      const onNavigationEnd = vi.fn();

      const result = await handlePopStateNavigation({
        location: { pathname: '/', search: '' },
        resetFn,
        getCurrentState: () => 'SEARCH_RESULTS',
        onNavigationStart,
        onNavigationEnd
      });

      expect(result.executed).toBe(true);
      expect(resetFn).toHaveBeenCalledTimes(1);
      expect(onNavigationStart).toHaveBeenCalledTimes(1);
      expect(onNavigationEnd).toHaveBeenCalledTimes(1);
    });

    it('garante que onNavigationEnd é chamado mesmo se ocorrer erro durante navegação', async () => {
      const onNavigationStart = vi.fn();
      const onNavigationEnd = vi.fn();
      const searchFn = vi.fn().mockRejectedValue(new Error('Erro de conexão'));

      const result = await handlePopStateNavigation({
        location: { pathname: '/', search: '?q=erro' },
        searchFn,
        onNavigationStart,
        onNavigationEnd
      });

      expect(result.executed).toBe(false);
      expect(onNavigationStart).toHaveBeenCalledTimes(1);
      expect(onNavigationEnd).toHaveBeenCalledTimes(1);
    });
  });
});
