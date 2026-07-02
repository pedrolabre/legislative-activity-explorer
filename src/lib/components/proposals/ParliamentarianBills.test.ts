import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ParliamentarianBills from './ParliamentarianBills.svelte';

function renderParliamentarianBills(propOverrides = {}) {
  return render(ParliamentarianBills, {
    props: {
      parliamentarianName: 'Ana Costa',
      bills: [],
      onSelectBill: () => undefined,
      onBackToParliamentarian: () => undefined,
      onStartOver: () => undefined,
      ...propOverrides
    }
  }).body;
}

describe('ParliamentarianBills', () => {
  it('renders a specific default empty state for associated proposals', () => {
    const html = renderParliamentarianBills();

    expect(html).toContain('Nenhuma proposição associada foi retornada pela fonte consultada.');
    expect(html).toContain('Você pode voltar ao perfil do parlamentar ou iniciar uma nova consulta.');
  });

  it('uses a specific message when presentation date is not informed', () => {
    const html = renderParliamentarianBills({
      bills: [
        {
          id: 'camara-proposicao-100',
          parliamentarianId: 'camara-10',
          identification: 'PL 2/2024',
          chamber: 'Câmara dos Deputados',
          status: 'Em tramitação',
          relationship: 'Autoria',
          officialSummary: 'Ementa oficial controlada.',
          sources: []
        }
      ]
    });

    expect(html).toContain('Não informado pela fonte oficial consultada.');
  });
});
