import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import BillDetail from './BillDetail.svelte';

function createBill(overrides = {}) {
  return {
    id: 'camara-proposicao-100',
    parliamentarianId: 'camara-10',
    identification: 'PL 2/2024',
    chamber: 'Câmara dos Deputados',
    status: 'Em tramitação',
    relationship: 'Autoria',
    officialSummary: 'Ementa oficial controlada.',
    sources: [],
    ...overrides
  };
}

function renderBillDetail(overrides = {}, propOverrides = {}) {
  return render(BillDetail, {
    props: {
      bill: createBill(overrides),
      parliamentarianName: 'Ana Costa',
      onBackToBills: () => undefined,
      onBackToParliamentarian: () => undefined,
      onStartOver: () => undefined,
      ...propOverrides
    }
  }).body;
}

describe('BillDetail', () => {
  it('keeps official summary out of the reviewed factual summary area when no review exists', () => {
    const html = renderBillDetail();

    expect(html).toContain('Ementa oficial');
    expect(html.match(/Ementa oficial controlada\./g)).toHaveLength(1);
    expect(html).toContain('Resumo factual revisado ainda não disponível.');
    expect(html).not.toContain('A ementa oficial é exibida nesta seção.');
    expect(html).not.toContain('<h4 id="factual-summary-title"');
  });

  it('renders reviewed factual summary only when one is provided', () => {
    const html = renderBillDetail({
      factualSummary: 'Resumo factual revisado controlado.'
    });

    expect(html).toContain('Resumo factual revisado');
    expect(html).toContain('Resumo factual revisado controlado.');
    expect(html).not.toContain('Resumo factual revisado ainda não disponível.');
  });

  it('renders an automatic official source without requiring reviewed external references', () => {
    const html = renderBillDetail({
      sources: [
        {
          id: 'camara-proposicao-100-fonte-oficial',
          type: 'official',
          label: 'Fonte oficial',
          title: 'Página oficial da proposição',
          publisher: 'Câmara dos Deputados',
          url: 'https://www.camara.leg.br/propostas-legislativas/100'
        }
      ]
    });

    expect(html).toContain('Página oficial da proposição');
    expect(html).toContain('href="https://www.camara.leg.br/propostas-legislativas/100"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(
      'Referências externas revisadas ainda não foram adicionadas para esta proposição.'
    );
    expect(html).not.toContain(
      'As três referências revisadas (oficial, imprensa e técnica) ainda não estão completas nesta visualização.'
    );
  });

  it('does not show the missing external references message when one reviewed external reference exists', () => {
    const html = renderBillDetail({
      sources: [
        {
          id: 'camara-proposicao-100-fonte-oficial',
          type: 'official',
          label: 'Fonte oficial',
          title: 'Página oficial da proposição',
          publisher: 'Câmara dos Deputados',
          url: 'https://www.camara.leg.br/propostas-legislativas/100'
        },
        {
          id: 'camara-proposicao-100-press',
          type: 'press',
          label: 'Cobertura de imprensa',
          title: 'Cobertura informativa revisada',
          publisher: 'Veículo de imprensa',
          url: 'https://example.com/politica/proposicao',
          checkedAt: '2026-06-29'
        }
      ]
    });

    expect(html).toContain('Cobertura informativa revisada');
    expect(html).not.toContain(
      'Referências externas revisadas ainda não foram adicionadas para esta proposição.'
    );
  });

  it('renders official Camara votes for an opened proposition when provided', () => {
    const html = renderBillDetail(
      {},
      {
        showOfficialVotes: true,
        associatedVotes: [
          {
            id: 'camara-votacao-100-1',
            billIdentification: 'PL 2/2024',
            chamber: 'Câmara dos Deputados',
            description: 'Votação nominal do texto-base.',
            parliamentarianVote: 'SIM',
            votedAt: '2024-06-12',
            officialResult: 'Aprovado'
          }
        ],
        onSelectVote: () => undefined
      }
    );

    expect(html).toContain('Votações da Câmara');
    expect(html).toContain('Votação nominal do texto-base.');
    expect(html).toContain('SIM');
    expect(html).toContain('Aprovado');
  });

  it('keeps official Camara votes section hidden when coverage is not requested', () => {
    const html = renderBillDetail(
      {},
      {
        associatedVotes: [
          {
            id: 'camara-votacao-100-1',
            billIdentification: 'PL 2/2024',
            chamber: 'Câmara dos Deputados',
            description: 'Votação nominal do texto-base.',
            parliamentarianVote: 'SIM'
          }
        ]
      }
    );

    expect(html).not.toContain('Votações da Câmara');
  });

  it('renders a specific Senado votes unavailable message when provided', () => {
    const html = renderBillDetail(
      {
        chamber: 'Senado Federal'
      },
      {
        unavailableVotesTitle: 'Votações nominais do Senado ainda não estão conectadas nesta versão.',
        unavailableVotesDescription:
          'Esta versão estática não usa scraping nem varre matérias, votações ou arquivos grandes para montar esse dado.'
      }
    );

    expect(html).toContain('Votações do Senado');
    expect(html).toContain('Votações nominais do Senado ainda não estão conectadas nesta versão.');
    expect(html).toContain(
      'Esta versão estática não usa scraping nem varre matérias, votações ou arquivos grandes para montar esse dado.'
    );
    expect(html).not.toContain('Votações da Câmara');
  });
});
