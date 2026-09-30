import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import InitialSearchForm from './InitialSearchForm.svelte';

describe('InitialSearchForm', () => {
  it('renders search input with official placeholder and accessible label', () => {
    const { body: html } = render(InitialSearchForm, {
      props: {
        onSearch: () => undefined
      }
    });

    expect(html).toContain('Nome de parlamentar ou termo de proposição');
    expect(html).toContain('placeholder="Nome de parlamentar ou proposição"');
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-labelledby="initial-search-label"');
    expect(html).toContain('id="initial-search"');
  });

  it('renders primary search button with civic accent styling', () => {
    const { body: html } = render(InitialSearchForm, {
      props: {
        onSearch: () => undefined
      }
    });

    expect(html).toMatch(/<button[^>]*type="submit"[^>]*class="[^"]*btn primary[^"]*"[^>]*>\s*Buscar\s*<\/button>/);
  });

  it('does not contain artificial shortcut buttons or mocked examples', () => {
    const { body: html } = render(InitialSearchForm, {
      props: {
        onSearch: () => undefined
      }
    });

    expect(html).not.toContain('chip');
    expect(html).not.toContain('examples');
    expect(html).not.toContain('Erika Hilton');
    expect(html).not.toContain('PL 2630/2020');
  });
});
