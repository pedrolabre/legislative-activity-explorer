import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import BillVotes from './BillVotes.svelte';

function renderBillVotes(overrides = {}) {
  return render(BillVotes, {
    props: {
      vote: {
        id: 'camara-votacao-100-1',
        parliamentarianId: 'camara-10',
        billIdentification: 'PL 2/2024',
        chamber: 'Câmara dos Deputados',
        description: 'Votação nominal oficial.',
        parliamentarianVoteNotice:
          'A fonte oficial não retornou lista nominal para esta votação.',
        individualVotes: [],
        ...overrides
      },
      parliamentarianName: 'Ana Costa',
      onBackToVotes: () => undefined,
      onBackToParliamentarian: () => undefined,
      onStartOver: () => undefined
    }
  }).body;
}

describe('BillVotes', () => {
  it('uses specific availability messages when official vote fields are absent', () => {
    const html = renderBillVotes();

    expect(html).toContain('Não informado pela fonte oficial consultada.');
    expect(html).toContain('Contagens agregadas não informadas pela fonte oficial consultada.');
    expect(html).toContain('A fonte oficial da Câmara não retornou lista nominal para esta votação.');
    expect(html).toContain('votações simbólicas ou secretas');
  });
});
