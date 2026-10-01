import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import AppSidebar from './AppSidebar.svelte';

describe('AppSidebar', () => {
  it('renders branding, title and intro description', () => {
    const { body: html } = render(AppSidebar, {
      props: {
        onSearch: () => undefined,
        onOpenAbout: () => undefined
      }
    });

    expect(html).toContain('O que o parlamentar fez');
    expect(html).toContain('Consulte projetos e votações');
    expect(html).toContain('Congresso Nacional a partir de registros oficiais disponíveis.');
  });

  it('renders search form and about button', () => {
    const { body: html } = render(AppSidebar, {
      props: {
        onSearch: () => undefined,
        onOpenAbout: () => undefined
      }
    });

    expect(html).toContain('Sobre e privacidade');
    expect(html).toContain('type="search"');
    expect(html).toContain('Buscar');
  });

  it('renders mobile slider handle for responsive expansion', () => {
    const { body: html } = render(AppSidebar, {
      props: {
        onSearch: () => undefined,
        onOpenAbout: () => undefined
      }
    });

    expect(html).toContain('id="sideHandle"');
    expect(html).toContain('aria-label="Deslizar para expandir"');
  });
});
