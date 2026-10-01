import { render } from 'svelte/server';
import { beforeEach, describe, expect, it } from 'vitest';
import Page from './+page.svelte';
import { navigateTo, reset } from '$lib/state/chatStore';
import type { LegislativeProposal, Parliamentarian } from '$lib/domain';

describe('page (+page.svelte Deep-Linking e Renderização da Página Inicial)', () => {
  const sampleParliamentarian: Parliamentarian = {
    id: 'camara-deputado-74400',
    origin: 'official',
    source: 'camara',
    sourceId: '74400',
    name: 'Deputada Teste',
    office: 'Deputada Federal',
    party: 'PARTIDO',
    state: 'SP',
    status: 'Exercício'
  };

  const sampleProposal: LegislativeProposal = {
    id: 'PL 1234/2024',
    origin: 'official',
    source: 'camara',
    sourceId: '1234',
    title: 'PL 1234/2024',
    type: 'PL',
    number: '1234',
    year: 2024,
    officialSummary: 'Ementa do projeto de teste para validação de renderização.',
    authorship: 'Deputada Teste',
    status: 'Em tramitação',
    references: []
  };

  beforeEach(() => {
    reset();
  });

  it('renderiza o layout inicial com skip-link, sidebar de busca e conversa de consulta', () => {
    const { body: html } = render(Page);

    expect(html).toContain('id="conteudo"');
    expect(html).toMatch(/class="app\b/);
    expect(html).toContain('O que o parlamentar fez');
    expect(html).toContain('Conversa de consulta');
  });

  it('renderiza no estado de boas-vindas quando inicializado', () => {
    const { body: html } = render(Page);

    expect(html).toContain('Consulte projetos e votações');
    expect(html).toContain('Buscar');
  });

  it('mantém integridade estrutural e de acessibilidade na inicialização', () => {
    const { body: html } = render(Page);

    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('Conversa de consulta');
  });

  it('renderiza resultados de busca quando o chatStore está no estado SEARCH_RESULTS', () => {
    navigateTo('SEARCH_RESULTS', {
      updates: {
        lastQuery: 'educacao',
        proposalsFound: [sampleProposal],
        parliamentariansFound: [sampleParliamentarian]
      }
    });

    const { body: html } = render(Page);
    expect(html).toContain('Resultado da busca');
    expect(html).toContain('educacao');
    expect(html).toContain('PL 1234/2024');
    expect(html).toContain('Deputada Teste');
  });

  it('renderiza detalhes do parlamentar quando o chatStore está em PARLIAMENTARIAN_DETAIL', () => {
    navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        lastQuery: 'tabata',
        selectedParliamentarian: sampleParliamentarian
      }
    });

    const { body: html } = render(Page);
    expect(html).toContain('Deputada Teste');
    expect(html).toContain('Deputada Federal');
    expect(html).toContain('Câmara dos Deputados');
  });

  it('renderiza detalhes da proposição quando o chatStore está em BILL_DETAIL', () => {
    navigateTo('BILL_DETAIL', {
      updates: {
        lastQuery: 'educacao',
        selectedProposal: sampleProposal
      }
    });

    const { body: html } = render(Page);
    expect(html).toContain('PL 1234/2024');
    expect(html).toContain('Ementa do projeto de teste para validação de renderização.');
  });

  it('renderiza informações institucionais quando o chatStore está em ABOUT', () => {
    navigateTo('ABOUT');

    const { body: html } = render(Page);
    expect(html).toContain('Sobre, privacidade e responsabilidade');
    expect(html).toContain('Finalidade pública');
    expect(html).toContain('Neutralidade');
    expect(html).toContain('Privacidade');
  });
});
