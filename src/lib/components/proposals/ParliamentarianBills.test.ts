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

    expect(html).toContain(
      'Nenhuma proposição associada a este parlamentar foi retornada pela fonte oficial consultada.'
    );
    expect(html).toContain(
      'A fonte consultada não retornou registros para esta seleção nesta consulta.'
    );
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

  it('renders dense proposal rows with bill-id, bill-kind, chamber, and action link', () => {
    const html = renderParliamentarianBills({
      bills: [
        {
          id: 'camara-proposicao-100',
          parliamentarianId: 'camara-10',
          identification: 'PL 2630/2020',
          chamber: 'Câmara dos Deputados',
          status: 'Em tramitação',
          relationship: 'Autoria',
          presentedAt: '2020-07-03',
          officialSummary: 'Institui a Lei Brasileira de Liberdade, Responsabilidade e Transparência na Internet.',
          sources: []
        }
      ]
    });

    expect(html).toContain('Lista de proposições');
    expect(html).toContain('1 carregadas');
    expect(html).toContain('bill-id');
    expect(html).toContain('PL 2630/2020');
    expect(html).toContain('bill-kind');
    expect(html).toContain('Autoria');
    expect(html).toContain('Casa');
    expect(html).toContain('Câmara dos Deputados');
    expect(html).toContain('Apresentação');
    expect(html).toContain('03/07/2020');
    expect(html).toContain('Ver detalhes →');
    expect(html).toContain('Voltar ao perfil');
    expect(html).toContain('Nova consulta');
  });

  it('renders on-demand pagination load-more button when there are more than 10 bills', () => {
    const fakeBills = Array.from({ length: 15 }, (_, i) => ({
      id: `camara-proposicao-${i + 1}`,
      parliamentarianId: 'camara-10',
      identification: `PL ${i + 1}/2024`,
      chamber: 'Câmara dos Deputados',
      status: 'Em tramitação',
      relationship: 'Relatoria',
      officialSummary: `Ementa do projeto ${i + 1}.`,
      sources: []
    }));

    const html = renderParliamentarianBills({ bills: fakeBills });

    expect(html).toContain('10 carregadas');
    expect(html).toContain('Carregar mais 5');
    expect(html).toContain('5 restantes');
  });
});
