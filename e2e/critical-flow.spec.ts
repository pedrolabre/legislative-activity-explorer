import { expect, test } from '@playwright/test';
import { setupHermeticApiMocks } from './fixtures/mockApi';

test.describe('Fluxo Crítico da Aplicação — E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupHermeticApiMocks(page);
  });

  test('executa o fluxo crítico completo: busca, perfil, proposições associadas, detalhe e votações nominais', async ({
    page
  }) => {
    // 1. Acesso à aplicação e verificação do estado inicial
    await page.goto('/');
    await expect(page).toHaveTitle(/O que o parlamentar fez/);

    const searchInput = page.locator('#initial-search');
    await expect(searchInput).toBeVisible();

    // 2. Busca por parlamentar
    await searchInput.fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // 3. Validação dos resultados da busca
    await expect(page.locator('.search-results-flow')).toBeVisible();
    const parliamentarianCardTitle = page.getByRole('heading', { name: 'Tabata Amaral' });
    await expect(parliamentarianCardTitle).toBeVisible();
    await expect(page.getByText(/Deputado federal · PSB\/SP/i)).toBeVisible();

    // 4. Seleção do perfil do parlamentar
    const viewProfileBtn = page.getByRole('button', { name: /Ver perfil de Tabata Amaral/i });
    await expect(viewProfileBtn).toBeVisible();
    await viewProfileBtn.click();

    // 5. Verificação da ficha biográfica
    await expect(page.getByRole('heading', { name: 'Tabata Amaral', level: 2 })).toBeVisible();
    await expect(page.getByText('Tabata Claudia Amaral de Pontes')).toBeVisible();
    await expect(page.getByText('Câmara dos Deputados')).toBeVisible();
    await expect(page.getByText('Exercício')).toBeVisible();

    // 6. Abertura das proposições associadas
    const openBillsBtn = page.getByRole('button', {
      name: /Abrir proposições associadas de Tabata Amaral/i
    });
    await expect(openBillsBtn).toBeVisible();
    await openBillsBtn.click();

    // 7. Validação da listagem de proposições
    await expect(page.getByRole('heading', { name: 'Lista de proposições' })).toBeVisible();
    await expect(page.getByText('PL 1234/2024')).toBeVisible();

    // 8. Seleção da proposição para exibição detalhada
    const billDetailBtn = page.getByRole('button', {
      name: /Ver detalhes de PL 1234\/2024/i
    });
    await expect(billDetailBtn).toBeVisible();
    await billDetailBtn.click();

    // 9. Verificação do painel de detalhes da proposição e alternância de abas
    await expect(page.getByRole('heading', { name: 'PL 1234/2024', level: 3 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dados' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Resumo' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fontes' })).toBeVisible();

    // Navegar para a aba "Resumo"
    await page.getByRole('tab', { name: 'Resumo' }).click();
    await expect(
      page.getByText('Institui diretrizes para o fomento da educação e tecnologia')
    ).toBeVisible();

    // Navegar para a aba de "Votações da Câmara"
    const votesTab = page.getByRole('tab', { name: /Votações da Câmara/i });
    await expect(votesTab).toBeVisible();
    await votesTab.click();

    // 10. Abertura do detalhe da votação
    const viewVoteBtn = page.getByRole('button', {
      name: /Ver votação de PL 1234\/2024/i
    });
    await expect(viewVoteBtn).toBeVisible();
    await viewVoteBtn.click();

    // 11. Verificação do painel de votações e lista nominal
    const nominalTab = page.getByRole('tab', { name: 'Lista nominal' });
    await expect(nominalTab).toBeVisible();
    await nominalTab.click();

    await expect(page.getByText('Deputado Carlos Lima')).toBeVisible();
    await expect(page.getByText('Deputada Beatriz Silva')).toBeVisible();

    // 12. Reinício da consulta via botão "Nova consulta"
    const startOverBtn = page.getByRole('button', { name: /Nova consulta/i }).first();
    await expect(startOverBtn).toBeVisible();
    await startOverBtn.click();

    // Confirma retorno ao formulário inicial
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue('');
  });

  test('suporta deep-linking com parâmetro de busca (?q=...)', async ({ page }) => {
    await page.goto('/?q=Tabata+Amaral');

    await expect(page.locator('.search-results-flow')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tabata Amaral' })).toBeVisible();
    await expect(page.getByText(/Deputado federal · PSB\/SP/i)).toBeVisible();
  });

  test('processa busca direta por notação legislativa (ex: PL 1234/2024)', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('#initial-search');
    await searchInput.fill('PL 1234/2024');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    // Direcionamento direto para o detalhe da proposição
    await expect(page.getByRole('heading', { name: 'PL 1234/2024', level: 3 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dados' })).toBeVisible();
  });

  test('sincroniza a URL com o estado de navegação e suporta retorno', async ({ page }) => {
    await page.goto('/');

    // Busca e checagem de URL
    await page.locator('#initial-search').fill('Tabata Amaral');
    await page.locator('button[type="submit"]:has-text("Buscar")').click();

    await expect(page.locator('.search-results-flow')).toBeVisible();
    await expect(page).toHaveURL(/q=Tabata(\+|%20)Amaral/);

    // Navegação para o perfil e checagem de URL
    await page.getByRole('button', { name: /Ver perfil de Tabata Amaral/i }).click();
    await expect(page.getByRole('heading', { name: 'Tabata Amaral', level: 2 })).toBeVisible();
    await expect(page).toHaveURL(/parl=camara-204528/);

    // Retorno aos resultados e restauração da URL
    await page.getByRole('button', { name: /Voltar aos resultados/i }).click();
    await expect(page.getByRole('heading', { name: 'Tabata Amaral' })).toBeVisible();
    await expect(page).toHaveURL(/q=Tabata(\+|%20)Amaral/);
  });
});
