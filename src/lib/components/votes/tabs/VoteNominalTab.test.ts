import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { DisplayVotePosition, ParliamentarianVoteIndividualView } from '$lib/domain';
import VoteNominalTab from './VoteNominalTab.svelte';

function generatePlenaryVotes(count: number, selectedIndex = -1): ParliamentarianVoteIndividualView[] {
  const positions: DisplayVotePosition[] = ['SIM', 'NÃO', 'ABSTENÇÃO', 'AUSENTE'];
  const parties = ['PT', 'PL', 'UNIÃO', 'PP', 'MDB', 'PSD', 'REPUBLICANOS', 'PSOL'];
  const states = ['SP', 'RJ', 'MG', 'BA', 'RS', 'PR', 'PE', 'CE'];

  return Array.from({ length: count }, (_, index) => {
    const isSelected = index === selectedIndex;
    return {
      parliamentarianName: isSelected ? 'Deputada em Consulta' : `Deputado Federal ${index + 1}`,
      party: parties[index % parties.length],
      state: states[index % states.length],
      vote: positions[index % positions.length],
      isSelectedParliamentarian: isSelected
    };
  });
}

describe('VoteNominalTab', () => {
  it('renders official empty message for Câmara when individualVotes is empty', () => {
    const { body: html } = render(VoteNominalTab, {
      props: {
        individualVotes: [],
        chamber: 'Câmara dos Deputados'
      }
    });

    expect(html).toContain('A fonte oficial da Câmara não retornou lista nominal para esta votação.');
    expect(html).toContain('votações simbólicas ou secretas');
    expect(html).toMatch(/<b class="empty-icon[^"]*">0<\/b>/);
  });

  it('renders official empty message for Senado when individualVotes is empty', () => {
    const { body: html } = render(VoteNominalTab, {
      props: {
        individualVotes: [],
        chamber: 'Senado Federal'
      }
    });

    expect(html).toContain('A fonte oficial do Senado não retornou lista nominal para esta votação.');
    expect(html).toContain('votações simbólicas ou secretas');
  });

  it('virtualizes/slices high-cardinality plenary vote (513 deputies) into default 25 items', () => {
    const votes513 = generatePlenaryVotes(513);
    const { body: html } = render(VoteNominalTab, {
      props: {
        individualVotes: votes513,
        chamber: 'Câmara dos Deputados'
      }
    });

    // Validates that only 25 articles are rendered initially in the DOM, keeping nodes bounded
    const renderedArticles = html.match(/<article class="nominal\s/g);
    expect(renderedArticles).toHaveLength(25);

    // Validates summary bar counts
    expect(html).toContain('Exibindo 1–25 de 513 parlamentares');

    // Validates search input and page size control
    expect(html).toContain('id="nominal-search-input"');
    expect(html).toContain('placeholder="Buscar por nome, partido ou UF..."');
    expect(html).toContain('id="nominal-page-size-select"');

    // Validates pagination controls for 513 items (ceil(513/25) = 21 pages)
    expect(html).toContain('Página 1 de 21');
    expect(html).toContain('« Primeira');
    expect(html).toContain('‹ Anterior');
    expect(html).toContain('Próxima ›');
    expect(html).toContain('Última »');

    // On page 1, previous and first buttons are disabled
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Primeira página"/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Página anterior"/);
  });

  it('renders real-time vote position counters in filter pills', () => {
    const votes = [
      { parliamentarianName: 'Dep. A', party: 'PT', state: 'SP', vote: 'SIM' as const },
      { parliamentarianName: 'Dep. B', party: 'PL', state: 'RJ', vote: 'SIM' as const },
      { parliamentarianName: 'Dep. C', party: 'PSD', state: 'MG', vote: 'NÃO' as const },
      { parliamentarianName: 'Dep. D', party: 'MDB', state: 'BA', vote: 'ABSTENÇÃO' as const },
      { parliamentarianName: 'Dep. E', party: 'PP', state: 'RS', vote: 'AUSENTE' as const }
    ];

    const { body: html } = render(VoteNominalTab, {
      props: { individualVotes: votes }
    });

    expect(html).toMatch(/Todos <span class="pill-count[^"]*">\(5\)<\/span>/);
    expect(html).toMatch(/SIM <span class="pill-count[^"]*">\(2\)<\/span>/);
    expect(html).toMatch(/NÃO <span class="pill-count[^"]*">\(1\)<\/span>/);
    expect(html).toMatch(/ABSTENÇÃO <span class="pill-count[^"]*">\(1\)<\/span>/);
    expect(html).toMatch(/AUSENTE <span class="pill-count[^"]*">\(1\)<\/span>/);
  });

  it('prioritizes selected parliamentarian to page 1 even when originally at index 500', () => {
    // 513 votes, selected parliamentarian is at index 500 (would be on page 21 without prioritization)
    const votes513 = generatePlenaryVotes(513, 500);

    const { body: html } = render(VoteNominalTab, {
      props: { individualVotes: votes513 }
    });

    // The selected parliamentarian MUST be rendered in the active first page
    expect(html).toContain('Deputada em Consulta');
    expect(html).toContain('Parlamentar selecionado');

    // First article in the feed must be the prioritized selected one
    const firstArticleMatch = html.match(/<article class="nominal selected[^"]*">([\s\S]*?)<\/article>/);
    expect(firstArticleMatch).not.toBeNull();
    expect(firstArticleMatch?.[1]).toContain('Deputada em Consulta');
  });

  it('renders small nominal lists (< 25) without pagination navigation', () => {
    const votes10 = generatePlenaryVotes(10);
    const { body: html } = render(VoteNominalTab, {
      props: { individualVotes: votes10 }
    });

    const renderedArticles = html.match(/<article class="nominal\s/g);
    expect(renderedArticles).toHaveLength(10);
    expect(html).toContain('Exibindo 1–10 de 10 parlamentares');
    expect(html).not.toContain('class="pagination-nav"');
  });

  it('includes accessible ARIA attributes across controls and summary bar', () => {
    const votes = generatePlenaryVotes(50);
    const { body: html } = render(VoteNominalTab, {
      props: { individualVotes: votes }
    });

    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Filtrar por posição de voto"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('role="feed"');
    expect(html).toContain('aria-label="Votação nominal dos parlamentares"');
    expect(html).toContain('aria-label="Navegação da lista nominal"');
    expect(html).toContain('aria-current="page"');
  });
});
