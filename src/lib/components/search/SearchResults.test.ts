import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import SearchResults from './SearchResults.svelte';

describe('SearchResults', () => {
  it('describes results as returned by consulted official sources', () => {
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
              status: 'Em exercício'
            }
          ],
          proposals: []
        },
        onSelectParliamentarian: () => undefined
      }
    }).body;

    expect(html).toContain('Registros exibidos conforme retorno das fontes oficiais consultadas.');
  });

  it('renders an action for official proposal results', () => {
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
              status: 'Em tramitação'
            }
          ]
        },
        onSelectProposal: () => undefined
      }
    }).body;

    expect(html).toContain('Ver proposição');
    expect(html).toContain('aria-label="Ver detalhe de PL 2630/2020"');
  });
});
