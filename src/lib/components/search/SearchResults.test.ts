import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import SearchResults from './SearchResults.svelte';

describe('SearchResults', () => {
  it('describes results as returned by consulted official sources and renders compact cards', () => {
    const html = render(SearchResults, {
      props: {
        query: 'ana',
        results: {
          parliamentarians: [
            {
              kind: 'parliamentarian',
              id: 'camara-10',
              name: 'Ana Costa',
              office: 'Deputado federal',
              party: 'ABC',
              state: 'MG',
              status: 'Em exercício',
              chamber: 'Câmara dos Deputados',
              term: 'Legislatura 57'
            }
          ],
          proposals: []
        },
        onSelectParliamentarian: () => undefined
      }
    }).body;

    expect(html).toContain('Registros exibidos conforme retorno das fontes oficiais consultadas.');
    expect(html).toMatch(/class="[^"]*\bresults\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\bcard\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\bcard-head\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\btype\b[^"]*"/);
    expect(html).toContain('Parlamentar');
    expect(html).toMatch(/class="[^"]*\bcard-source\b[^"]*"/);
    expect(html).toContain('Câmara dos Deputados');
    expect(html).toMatch(/<h3[^>]*>\s*Ana Costa\s*<\/h3>/);
    expect(html).toMatch(/class="[^"]*\bcard-sub\b[^"]*"/);
    expect(html).toContain('Deputado federal · ABC/MG');
    expect(html).toMatch(/class="[^"]*\bcard-meta\b[^"]*"/);
    expect(html).toContain('Situação');
    expect(html).toContain('Em exercício');
    expect(html).toContain('Legislatura');
    expect(html).toContain('Legislatura 57');
    expect(html).toContain('btn secondary card-btn');
    expect(html).toContain('Ver perfil');
    expect(html).toContain('aria-label="Ver perfil de Ana Costa"');
  });

  it('renders an action for official proposal results in a compact card', () => {
    const html = render(SearchResults, {
      props: {
        query: 'PL 2630/2020',
        results: {
          parliamentarians: [],
          proposals: [
            {
              kind: 'proposal',
              id: 'camara-proposicao-2630',
              title: 'PL 2630/2020',
              chamber: 'Câmara dos Deputados',
              type: 'PL',
              subject: 'Liberdade, responsabilidade e transparência na internet',
              status: 'Em tramitação'
            }
          ]
        },
        onSelectProposal: () => undefined
      }
    }).body;

    expect(html).toMatch(/class="[^"]*\bresults\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\bcard\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\btype\b[^"]*"/);
    expect(html).toContain('Proposição');
    expect(html).toMatch(/class="[^"]*\bcard-source\b[^"]*"/);
    expect(html).toContain('Câmara dos Deputados');
    expect(html).toMatch(/<h3[^>]*>\s*PL 2630\/2020\s*<\/h3>/);
    expect(html).toMatch(/class="[^"]*\bcard-sub\b[^"]*"/);
    expect(html).toContain('Liberdade, responsabilidade e transparência na internet');
    expect(html).toMatch(/class="[^"]*\bcard-meta\b[^"]*"/);
    expect(html).toContain('Situação');
    expect(html).toContain('Em tramitação');
    expect(html).toContain('Tipo');
    expect(html).toContain('PL');
    expect(html).toContain('Ver proposição');
    expect(html).toContain('aria-label="Ver detalhe de PL 2630/2020"');
  });

  it('renders informative empty state with civic semantics and ARIA status when no results match', () => {
    const html = render(SearchResults, {
      props: {
        query: 'inexistente123',
        results: {
          parliamentarians: [],
          proposals: []
        }
      }
    }).body;

    expect(html).toContain('role="status"');
    expect(html).toMatch(/class="[^"]*(?<![\w-])empty(?![\w-])/);
    expect(html).toContain('Não houve correspondência nesta busca.');
    expect(html).toContain('Confira a grafia ou tente outro nome, sigla ou número de proposição.');
    expect(html).not.toMatch(/class="[^"]*(?<![\w-])results(?![\w-])/);
    expect(html).not.toMatch(/class="[^"]*(?<![\w-])card(?![\w-])/);
  });
});
