import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import BillVotes from './BillVotes.svelte';

function renderBillVotes(overrides = {}, propOverrides = {}) {
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
      onStartOver: () => undefined,
      ...propOverrides
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

  it('renders horizontal tabs navigation with accessible ARIA attributes', () => {
    const html = renderBillVotes();

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Seções do detalhe da votação"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('id="tab-summary"');
    expect(html).toContain('aria-controls="panel-summary"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="tab-counts"');
    expect(html).toContain('aria-controls="panel-counts"');
    expect(html).toContain('id="tab-nominal"');
    expect(html).toContain('aria-controls="panel-nominal"');

    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="panel-summary"');
    expect(html).toContain('id="panel-counts"');
    expect(html).toContain('id="panel-nominal"');
  });

  it('renders vote summary tab with structured sheet, official result and registered vote', () => {
    const html = renderBillVotes({
      billIdentification: 'PLP 19/2023',
      chamber: 'Câmara dos Deputados',
      description: 'Votação nominal oficial associada à matéria.',
      officialResult: 'Aprovado',
      parliamentarianVote: 'SIM',
      votedAt: '2024-06-20'
    }, {
      parliamentarianName: 'Erika Hilton'
    });

    expect(html).toContain('PLP 19/2023');
    expect(html).toContain('Câmara dos Deputados');
    expect(html).toContain('Aprovado');
    expect(html).toContain('Voto registrado (Erika Hilton)');
    expect(html).toContain('SIM');
    expect(html).toContain('Votação nominal oficial associada à matéria.');
  });

  it('renders aggregated counts tab with 4 numeric blocks and informed total', () => {
    const html = renderBillVotes({
      counts: {
        yes: 302,
        no: 121,
        abstention: 7,
        absent: 63
      }
    });

    expect(html).toContain('SIM');
    expect(html).toContain('302');
    expect(html).toContain('NÃO');
    expect(html).toContain('121');
    expect(html).toContain('ABSTENÇÃO');
    expect(html).toContain('7');
    expect(html).toContain('AUSENTE');
    expect(html).toContain('63');
    expect(html).toContain('Total informado: 493');
  });

  it('renders nominal list with highlighted active parliamentarian', () => {
    const html = renderBillVotes({
      individualVotes: [
        {
          parliamentarianName: 'Erika Hilton',
          party: 'PSOL',
          state: 'SP',
          vote: 'SIM',
          isSelectedParliamentarian: true
        },
        {
          parliamentarianName: 'Bruno Lima',
          party: 'XYZ',
          state: 'SP',
          vote: 'NÃO',
          isSelectedParliamentarian: false
        }
      ]
    });

    expect(html).toContain('Parlamentar selecionado');
    expect(html).toContain('Erika Hilton');
    expect(html).toContain('PSOL - SP');
    expect(html).toContain('SIM');
    expect(html).toContain('Bruno Lima');
    expect(html).toContain('XYZ - SP');
    expect(html).toContain('NÃO');
  });

  it('renders contextual action buttons with return and start over', () => {
    const htmlWithParliamentarian = renderBillVotes({}, { parliamentarianName: 'Ana Costa' });
    expect(htmlWithParliamentarian).toContain('← Voltar às votações');
    expect(htmlWithParliamentarian).toContain('Voltar ao perfil');
    expect(htmlWithParliamentarian).toContain('Nova consulta');

    const htmlDirect = renderBillVotes({}, { parliamentarianName: undefined });
    expect(htmlDirect).toContain('← Voltar às votações');
    expect(htmlDirect).not.toContain('Voltar ao perfil');
    expect(htmlDirect).toContain('Nova consulta');
  });

  it('renders full plenary vote (513 deputies) in nominal tab with bounded DOM nodes and pagination', () => {
    const votes513 = Array.from({ length: 513 }, (_, i) => ({
      parliamentarianName: i === 450 ? 'Erika Hilton' : `Deputado Federal ${i + 1}`,
      party: i === 450 ? 'PSOL' : 'PT',
      state: 'SP',
      vote: i % 2 === 0 ? ('SIM' as const) : ('NÃO' as const),
      isSelectedParliamentarian: i === 450
    }));

    const html = renderBillVotes({
      individualVotes: votes513
    });

    // Only 25 nominal articles in DOM (bounded footprint)
    const nominalArticles = html.match(/<article class="nominal\s/g);
    expect(nominalArticles).toHaveLength(25);

    // Selected parliamentarian is prioritized to the first page
    expect(html).toContain('Parlamentar selecionado');
    expect(html).toContain('Erika Hilton');

    // Pagination controls and summary indicators
    expect(html).toContain('Exibindo 1–25 de 513 parlamentares');
    expect(html).toContain('Página 1 de 21');
    expect(html).toContain('« Primeira');
    expect(html).toContain('Última »');
  });
});

