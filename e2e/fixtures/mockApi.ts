import type { Page, Route } from '@playwright/test';

/**
 * Respostas mock determinísticas para as APIs da Câmara dos Deputados e Senado Federal.
 * Garante testes 100% herméticos, sem dependência de rede externa.
 */

export const mockDeputadoTabata = {
  id: 204528,
  uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204528',
  nome: 'Tabata Amaral',
  nomeCivil: 'Tabata Claudia Amaral de Pontes',
  siglaPartido: 'PSB',
  uriPartido: 'https://dadosabertos.camara.leg.br/api/v2/partidos/36832',
  siglaUf: 'SP',
  idLegislatura: 57,
  urlFoto: 'https://www.camara.leg.br/internet/deputado/bandep/204528.jpg',
  email: 'dep.tabataamaral@camara.leg.br',
  ultimoStatus: {
    id: 204528,
    uri: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204528',
    nome: 'Tabata Amaral',
    siglaPartido: 'PSB',
    uriPartido: 'https://dadosabertos.camara.leg.br/api/v2/partidos/36832',
    siglaUf: 'SP',
    idLegislatura: 57,
    urlFoto: 'https://www.camara.leg.br/internet/deputado/bandep/204528.jpg',
    email: 'dep.tabataamaral@camara.leg.br',
    situacao: 'Exercício',
    condicaoEleitoral: 'Titular',
    gabinete: {
      nome: '415',
      predio: '4',
      sala: '415',
      andar: '4',
      telefone: '3215-5415',
      email: 'dep.tabataamaral@camara.leg.br'
    }
  }
};

export const mockProposicaoPL1234 = {
  id: 1234,
  uri: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/1234',
  siglaTipo: 'PL',
  codTipo: 139,
  numero: 1234,
  ano: 2024,
  ementa: 'Institui diretrizes para o fomento da educação e tecnologia no ensino médio.',
  ementaDetalhada: 'Institui diretrizes para o fomento da educação e tecnologia no ensino médio público nacional.',
  dataApresentacao: '2024-03-15T14:30:00',
  statusProposicao: {
    dataHora: '2024-04-10T16:00:00',
    sequencia: 1,
    siglaOrgao: 'PLEN',
    regime: 'Ordinária (Art. 151, III, RICD)',
    descricaoTramitacao: 'Aprovada em Plenário',
    descricaoSituacao: 'Pronta para Pauta',
    despacho: 'Aprovado o projeto.'
  }
};

export const mockVotacaoPL1234 = {
  id: '2234-99',
  uri: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/2234-99',
  data: '2024-04-10',
  dataHoraRegistro: '2024-04-10T17:30:00',
  siglaOrgao: 'PLEN',
  aprovacao: 1,
  proposicaoObjeto: 'PL 1234/2024',
  descricao: 'Votação do PL 1234/2024 em Plenário.'
};

export const mockVotosPL1234 = [
  {
    deputado_: {
      id: 204528,
      nome: 'Tabata Amaral',
      siglaPartido: 'PSB',
      siglaUf: 'SP',
      idLegislatura: 57,
      urlFoto: 'https://www.camara.leg.br/internet/deputado/bandep/204528.jpg'
    },
    tipoVoto: 'Sim'
  },
  {
    deputado_: {
      id: 100001,
      nome: 'Deputado Carlos Lima',
      siglaPartido: 'PL',
      siglaUf: 'RJ',
      idLegislatura: 57,
      urlFoto: ''
    },
    tipoVoto: 'Não'
  },
  {
    deputado_: {
      id: 100002,
      nome: 'Deputada Beatriz Silva',
      siglaPartido: 'PT',
      siglaUf: 'BA',
      idLegislatura: 57,
      urlFoto: ''
    },
    tipoVoto: 'Sim'
  }
];

export const mockSenadorPacheco = {
  IdentificacaoParlamentar: {
    CodigoParlamentar: '5953',
    NomeParlamentar: 'Rodrigo Pacheco',
    NomeCompletoParlamentar: 'Rodrigo Otávio Soares Pacheco',
    FormaTratamento: 'Senador',
    SiglaPartidoParlamentar: 'PSD',
    UfParlamentar: 'MG',
    UrlFotoParlamentar: '',
    UrlPaginaParlamentar: '',
    EmailParlamentar: 'sen.rodrigopacheco@senado.leg.br'
  }
};

export type ValueOrGetter<T> = T | (() => T | undefined);

export interface MockApiOptions {
  camaraStatus?: ValueOrGetter<number>;
  senadoStatus?: ValueOrGetter<number>;
  camaraNetworkFail?: ValueOrGetter<boolean>;
  senadoNetworkFail?: ValueOrGetter<boolean>;
  emptyResults?: ValueOrGetter<boolean>;
}

function resolveOption<T>(option: ValueOrGetter<T> | undefined, fallback: T): T {
  if (option === undefined) return fallback;
  if (typeof option === 'function') {
    const res = (option as () => T | undefined)();
    return res !== undefined ? res : fallback;
  }
  return option;
}

/**
 * Configura interceptação de rotas HTTP com mocks herméticos.
 */
export async function setupHermeticApiMocks(
  page: Page,
  options: MockApiOptions = {}
): Promise<void> {
  // 1. Interceptar fotos externas da Câmara para resposta estática instantânea
  await page.route(/https:\/\/www\.camara\.leg\.br\/.*(jpg|png|webp)/, async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=', 'base64')
    });
  });

  // 2. Interceptar API da Câmara dos Deputados
  await page.route(/https:\/\/dadosabertos\.camara\.leg\.br\/api\/v2\/.*/, async (route: Route) => {
    const camaraNetworkFail = resolveOption(options.camaraNetworkFail, false);
    if (camaraNetworkFail) {
      await route.abort('failed');
      return;
    }

    const camaraStatus = resolveOption(options.camaraStatus, 200);
    if (camaraStatus >= 400) {
      await route.fulfill({
        status: camaraStatus,
        contentType: 'application/json',
        body: JSON.stringify({ erro: `Falha simulada na API da Câmara (${camaraStatus})` })
      });
      return;
    }

    const emptyResults = resolveOption(options.emptyResults, false);
    if (emptyResults) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dados: [], links: [] })
      });
      return;
    }

    const url = new URL(route.request().url());
    const path = url.pathname;

    // Listagem ou busca de deputados
    if (path.endsWith('/deputados')) {
      const nome = url.searchParams.get('nome')?.toLowerCase() ?? '';
      if (!nome || nome.includes('tabata')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            dados: [
              {
                id: mockDeputadoTabata.id,
                uri: mockDeputadoTabata.uri,
                nome: mockDeputadoTabata.nome,
                siglaPartido: mockDeputadoTabata.siglaPartido,
                uriPartido: mockDeputadoTabata.uriPartido,
                siglaUf: mockDeputadoTabata.siglaUf,
                idLegislatura: mockDeputadoTabata.idLegislatura,
                urlFoto: mockDeputadoTabata.urlFoto,
                email: mockDeputadoTabata.email
              }
            ],
            links: []
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dados: [], links: [] })
      });
      return;
    }

    // Detalhe de um deputado específico
    if (path.includes('/deputados/204528')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dados: mockDeputadoTabata,
          links: []
        })
      });
      return;
    }

    // Proposições (busca geral ou por autor)
    if (path.endsWith('/proposicoes')) {
      const idDeputadoAutor = url.searchParams.get('idDeputadoAutor');
      const keywords = url.searchParams.get('keywords')?.toLowerCase() ?? '';
      const numero = url.searchParams.get('numero');

      if (idDeputadoAutor === '204528' || keywords.includes('educacao') || keywords.includes('tecnologia') || numero === '1234') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            dados: [
              {
                id: mockProposicaoPL1234.id,
                uri: mockProposicaoPL1234.uri,
                siglaTipo: mockProposicaoPL1234.siglaTipo,
                codTipo: mockProposicaoPL1234.codTipo,
                numero: mockProposicaoPL1234.numero,
                ano: mockProposicaoPL1234.ano,
                ementa: mockProposicaoPL1234.ementa,
                ementaDetalhada: mockProposicaoPL1234.ementaDetalhada
              }
            ],
            links: []
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ dados: [], links: [] })
      });
      return;
    }

    // Temas da proposição
    if (path.includes('/proposicoes/1234/temas')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dados: [{ codTema: 46, tema: 'Educação', relevancia: 1 }],
          links: []
        })
      });
      return;
    }

    // Votações da proposição
    if (path.includes('/proposicoes/1234/votacoes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dados: [mockVotacaoPL1234],
          links: []
        })
      });
      return;
    }

    // Detalhe de proposição específica
    if (path.includes('/proposicoes/1234')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dados: mockProposicaoPL1234,
          links: []
        })
      });
      return;
    }

    // Votação específica
    if (path.includes('/votacoes/2234-99/votos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dados: mockVotosPL1234,
          links: []
        })
      });
      return;
    }

    if (path.includes('/votacoes/2234-99')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dados: mockVotacaoPL1234,
          links: []
        })
      });
      return;
    }

    // Fallback padrão para a Câmara
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dados: [], links: [] })
    });
  });

  // 3. Interceptar API do Senado Federal
  await page.route(/https:\/\/legis\.senado\.leg\.br\/dadosabertos\/.*/, async (route: Route) => {
    const senadoNetworkFail = resolveOption(options.senadoNetworkFail, false);
    if (senadoNetworkFail) {
      await route.abort('failed');
      return;
    }

    const senadoStatus = resolveOption(options.senadoStatus, 200);
    if (senadoStatus >= 400) {
      await route.fulfill({
        status: senadoStatus,
        contentType: 'application/json',
        body: JSON.stringify({ erro: `Falha simulada na API do Senado (${senadoStatus})` })
      });
      return;
    }

    const emptyResults = resolveOption(options.emptyResults, false);
    if (emptyResults) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
      return;
    }

    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path.includes('/senador/lista/atual')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ListaParlamentarEmExercicio: {
            Parlamentares: {
              Parlamentar: [mockSenadorPacheco]
            }
          }
        })
      });
      return;
    }

    if (path.includes('/processo')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          PesquisaBasicaProcesso: {
            Processos: {
              Processo: []
            }
          }
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });
}

/**
 * Helper para simular indisponibilidade parcial (Senado com erro HTTP 500).
 */
export async function setupSenado500Error(page: Page): Promise<void> {
  await setupHermeticApiMocks(page, { senadoStatus: 500 });
}

/**
 * Helper para simular indisponibilidade da Câmara (erro HTTP 500).
 */
export async function setupCamara500Error(page: Page): Promise<void> {
  await setupHermeticApiMocks(page, { camaraStatus: 500 });
}

/**
 * Helper para simular indisponibilidade total (ambas as Casas com erro HTTP 500).
 */
export async function setupTotal500Error(page: Page): Promise<void> {
  await setupHermeticApiMocks(page, { camaraStatus: 500, senadoStatus: 500 });
}

/**
 * Helper para simular erro total de rede (abort de conexão).
 */
export async function setupTotalNetworkError(page: Page): Promise<void> {
  await setupHermeticApiMocks(page, { camaraNetworkFail: true, senadoNetworkFail: true });
}

/**
 * Helper para simular buscas sem nenhum resultado nas fontes públicas.
 */
export async function setupEmptySearchMocks(page: Page): Promise<void> {
  await setupHermeticApiMocks(page, { emptyResults: true });
}
