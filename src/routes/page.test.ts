import { render } from 'svelte/server';
import { beforeEach, describe, expect, it } from 'vitest';
import Page from './+page.svelte';
import { reset } from '$lib/state/chatStore';

describe('page (+page.svelte Deep-Linking e Renderização da Página Inicial)', () => {
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
});
