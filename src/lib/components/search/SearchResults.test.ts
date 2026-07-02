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
});
