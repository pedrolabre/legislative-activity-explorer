import { expect, test } from '@playwright/test';
import {
  setupEmptySearchMocks,
  setupHermeticApiMocks,
  setupSenado500Error,
  setupTotal500Error
} from './fixtures/mockApi';

test.describe('Responsividade Mobile — Viewport 375x667 (iPhone SE)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await setupHermeticApiMocks(page);
  });

  test('expande, colapsa e auto-recolhe a barra lateral (AppSidebar) no cabeçalho mobile', async ({
    page
  }) => {
    await page.goto('/');

    const sideElement = page.locator('#side');
    const sideHandle = page.locator('#sideHandle');
    const introText = page.locator('.intro');
    const aboutBtn = page.getByRole('button', { name: /Sobre e privacidade/i });

    // 1. Estado inicial colapsado no topo
    await expect(sideElement).toBeVisible();
    await expect(sideElement).not.toHaveClass(/is-maximized/);
    await expect(sideHandle).toBeVisible();
    await expect(sideHandle).toHaveAttribute('aria-expanded', 'false');
    await expect(introText).not.toBeVisible();
    await expect(aboutBtn).not.toBeVisible();

    // 2. Expandir ao acionar o manipulador (#sideHandle)
    await sideHandle.click();
    await expect(sideElement).toHaveClass(/is-maximized/);
    await expect(sideHandle).toHaveAttribute('aria-expanded', 'true');
    await expect(introText).toBeVisible();
    await expect(aboutBtn).toBeVisible();

    // 3. Recolher ao acionar o manipulador novamente
    await sideHandle.click();
    await expect(sideElement).not.toHaveClass(/is-maximized/);
    await expect(sideHandle).toHaveAttribute('aria-expanded', 'false');
    await expect(introText).not.toBeVisible();

    // 4. Expandir ao tocar na marca (.brand)
    const brandElement = page.locator('.brand');
    await brandElement.click();
    await expect(sideElement).toHaveClass(/is-maximized/);
    await expect(introText).toBeVisible();

    // 5. Ao submeter uma busca, a barra lateral recolhe automaticamente
    const searchInput = page.locator('#initial-search');
    await searchInput.fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    await expect(sideElement).not.toHaveClass(/is-maximized/);
    await expect(page.locator('.search-results-flow')).toBeVisible();
  });

  test('renderiza grid de resultados em coluna única sem provocar overflow horizontal', async ({
    page
  }) => {
    await page.goto('/');

    await page.locator('#initial-search').fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    await expect(page.locator('.search-results-flow')).toBeVisible();
    const parliamentarianCard = page.getByRole('heading', { name: 'Tabata Amaral' });
    await expect(parliamentarianCard).toBeVisible();

    // Verifica que o grid de resultados adota 1 coluna no mobile (<= 700px)
    const resultsContainer = page.locator('.results').first();
    const gridColumns = await resultsContainer.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });
    const columnCount = gridColumns.trim().split(/\s+/).length;
    expect(columnCount).toBe(1);

    // Garante que não há overflow horizontal (scrollWidth <= clientWidth)
    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});

test.describe('Responsividade Mobile — Viewport 390x844 (iPhone 12/13/14)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await setupHermeticApiMocks(page);
  });

  test('executa fluxo completo de consulta, perfil e proposições em layout mobile sem quebras', async ({
    page
  }) => {
    await page.goto('/');

    // Busca
    await page.locator('#initial-search').fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    await expect(page.locator('.search-results-flow')).toBeVisible();

    // Navega para o perfil
    const viewProfileBtn = page.getByRole('button', { name: /Ver perfil de Tabata Amaral/i });
    await expect(viewProfileBtn).toBeVisible();
    await viewProfileBtn.click();

    await expect(page.getByRole('heading', { name: 'Tabata Amaral', level: 2 })).toBeVisible();

    // Abre proposições associadas
    const openBillsBtn = page.getByRole('button', {
      name: /Abrir proposições associadas de Tabata Amaral/i
    });
    await expect(openBillsBtn).toBeVisible();
    await openBillsBtn.click();

    await expect(page.getByRole('heading', { name: 'Lista de proposições' })).toBeVisible();
    await expect(page.getByText('PL 1234/2024')).toBeVisible();

    // Acessa detalhe da proposição
    const viewBillBtn = page.getByRole('button', { name: /Ver detalhes de PL 1234\/2024/i });
    await expect(viewBillBtn).toBeVisible();
    await viewBillBtn.click();

    await expect(page.getByRole('heading', { name: 'PL 1234/2024', level: 3 })).toBeVisible();

    // Testa alternância de abas em tela estreita
    const summaryTab = page.getByRole('tab', { name: 'Resumo' });
    await expect(summaryTab).toBeVisible();
    await summaryTab.click();
    await expect(
      page.getByText('Institui diretrizes para o fomento da educação e tecnologia')
    ).toBeVisible();

    // Garante ausência de transbordamento horizontal durante todo o fluxo
    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Reinicia a consulta via "Nova consulta"
    const startOverBtn = page.getByRole('button', { name: /Nova consulta/i }).first();
    await expect(startOverBtn).toBeVisible();
    await startOverBtn.click();

    await expect(page.locator('#initial-search')).toBeVisible();
    await expect(page.locator('#initial-search')).toHaveValue('');
  });
});

test.describe('Resiliência de Rede e Tolerância a Falhas HTTP', () => {
  test('exibe aviso amigável recuperável e preserva resultados da Câmara quando o Senado retorna HTTP 500', async ({
    page
  }) => {
    // Simula falha 500 no Senado, mantendo a Câmara 200 OK
    await setupSenado500Error(page);

    await page.goto('/');
    await page.locator('#initial-search').fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // 1. Resultados da Câmara permanecem renderizados
    await expect(page.locator('.search-results-flow')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tabata Amaral' })).toBeVisible();
    await expect(page.getByText(/Deputado federal · PSB\/SP/i)).toBeVisible();

    // 2. Banner de aviso amigável recuperável (role="status") é apresentado
    const noticeLocator = page.locator('p[role="status"]');
    await expect(noticeLocator).toBeVisible();
    await expect(noticeLocator).toContainText(
      'A fonte oficial do Senado Federal retornou uma falha HTTP nesta consulta. Os resultados retornados foram exibidos.'
    );

    // 3. Usuário consegue interagir normalmente com o parlamentar exibido
    const viewProfileBtn = page.getByRole('button', { name: /Ver perfil de Tabata Amaral/i });
    await expect(viewProfileBtn).toBeVisible();
    await viewProfileBtn.click();
    await expect(page.getByRole('heading', { name: 'Tabata Amaral', level: 2 })).toBeVisible();
  });

  test('trata falha total das fontes (HTTP 500 em ambas as Casas) com aviso institucional amigável', async ({
    page
  }) => {
    // Simula falha 500 em ambas as Casas
    await setupTotal500Error(page);

    await page.goto('/');
    await page.locator('#initial-search').fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // 1. Banner de aviso amigável com mensagem institucional
    const noticeLocator = page.locator('p[role="status"]').first();
    await expect(noticeLocator).toBeVisible();
    await expect(noticeLocator).toContainText(
      'As fontes oficiais da Câmara dos Deputados e do Senado Federal retornaram falha HTTP nesta consulta. Tente novamente mais tarde.'
    );

    // 2. Estado vazio é exibido sem erros fatais de JavaScript
    await expect(page.locator('.empty[role="status"]')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Não houve correspondência nesta busca.' })
    ).toBeVisible();
  });

  test('recupera a busca com sucesso após restabelecimento dos serviços oficiais (self-healing / retry)', async ({
    page
  }) => {
    let failureActive = true;

    // Configura mocks dinâmicos que começam falhando e depois se restabelecem
    await setupHermeticApiMocks(page, {
      camaraStatus: () => (failureActive ? 500 : 200),
      senadoStatus: () => (failureActive ? 500 : 200)
    });

    await page.goto('/');

    // 1. Primeira busca sob indisponibilidade
    const searchInput = page.locator('#initial-search');
    await searchInput.fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // Constata o aviso de indisponibilidade
    await expect(
      page.locator('p[role="status"]:has-text("falha HTTP nesta consulta")')
    ).toBeVisible();

    // 2. Restabelecimento das APIs oficiais
    failureActive = false;

    // 3. Usuário realiza nova busca
    await searchInput.fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // 4. Interface se recupera: resultados são exibidos e mensagem de erro é removida
    await expect(page.locator('.search-results-flow')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tabata Amaral' })).toBeVisible();
    await expect(
      page.locator('p[role="status"]:has-text("falha HTTP nesta consulta")')
    ).not.toBeVisible();
  });
});

test.describe('Estados Vazios e Proposições Não Encontradas', () => {
  test('renderiza container de estado vazio (.empty) com orientações para consulta sem correspondência', async ({
    page
  }) => {
    // Configura retorno vazio determinístico
    await setupEmptySearchMocks(page);

    await page.goto('/');
    const searchInput = page.locator('#initial-search');
    await searchInput.fill('TermoInexistenteXYZ');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // 1. Cabeçalho informa zero registros
    await expect(
      page.getByText('Nenhum registro encontrado para TermoInexistenteXYZ.')
    ).toBeVisible();

    // 2. Container .empty exibe o selo "0", título e orientação amigável
    const emptyContainer = page.locator('.empty[role="status"]');
    await expect(emptyContainer).toBeVisible();
    await expect(emptyContainer.locator('b')).toHaveText('0');
    await expect(
      page.getByRole('heading', { name: 'Não houve correspondência nesta busca.' })
    ).toBeVisible();
    await expect(
      page.getByText('Confira a grafia ou tente outro nome, sigla ou número de proposição.')
    ).toBeVisible();

    // 3. Nenhum card de parlamentar ou proposição é renderizado
    await expect(page.locator('.card')).toHaveCount(0);
  });

  test('exibe aviso amigável ao pesquisar identificador de proposição inexistente (PL 99999/2026)', async ({
    page
  }) => {
    await setupHermeticApiMocks(page);

    await page.goto('/');
    await page.locator('#initial-search').fill('PL 99999/2026');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // Mensagem orientadora de proposição direta não localizada
    const noticeLocator = page.locator('p[role="status"]').first();
    await expect(noticeLocator).toBeVisible();
    await expect(noticeLocator).toContainText(
      'Nenhuma proposição oficial foi encontrada para PL 99999/2026 nas fontes consultadas. Confira tipo, número e ano.'
    );

    // Estado vazio é renderizado
    await expect(page.locator('.empty[role="status"]')).toBeVisible();
  });
});
