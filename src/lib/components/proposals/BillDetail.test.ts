import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import BillDetail from './BillDetail.svelte';

function createBill(overrides = {}) {
  return {
    id: 'camara-proposicao-100',
    parliamentarianId: 'camara-10',
    identification: 'PL 2/2024',
    type: 'PL',
    number: '2',
    year: 2024,
    subjectLabel: 'Tema',
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
    expect(html).toContain('Resumo factual revisado ainda não foi adicionado para esta proposição.');
    expect(html).toContain(
      'Fonte oficial da proposição não foi retornada no dado disponível nesta consulta.'
    );
    expect(html).not.toContain('A ementa oficial é exibida nesta seção.');
    expect(html).not.toContain('<h4 id="factual-summary-title"');
  });

  it('renders separated official Camara proposition detail fields', () => {
    const html = renderBillDetail({
      subject: 'Educacao',
      currentStageLabel: 'Tramitação atual',
      currentStage: 'Aguardando designação de relator',
      officialFullTextUrl:
        'https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=100'
    });

    expect(html).toContain('Tipo');
    expect(html).toContain('PL');
    expect(html).toContain('Número');
    expect(html).toContain('2');
    expect(html).toContain('Ano');
    expect(html).toContain('2024');
    expect(html).toContain('Tema');
    expect(html).toContain('Educacao');
    expect(html).toContain('Tramitação atual');
    expect(html).toContain('Aguardando designação de relator');
    expect(html).toContain('Inteiro teor oficial');
    expect(html).toContain(
      'href="https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=100"'
    );
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('renders direct proposal detail without a parliamentarian association', () => {
    const html = renderBillDetail(
      {
        relationship: ''
      },
      {
        parliamentarianName: undefined,
        onBackToResults: () => undefined
      }
    );

    expect(html).toContain('Registro oficial consultado diretamente.');
    expect(html).toContain('Voltar aos resultados');
    expect(html).not.toContain('Registro associado a');
    expect(html).not.toContain('Voltar ao perfil');
    expect(html).not.toContain('Vínculo');
  });

  it('renders reviewed factual summary only when one is provided', () => {
    const html = renderBillDetail({
      factualSummary: 'Resumo factual revisado controlado.'
    });

    expect(html).toContain('Resumo factual revisado');
    expect(html).toContain('Resumo factual revisado controlado.');
    expect(html).not.toContain('Resumo factual revisado ainda não foi adicionado para esta proposição.');
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
      'Conjunto completo de referências externas revisadas ainda não foi adicionado para esta proposição.'
    );
  });

  it('does not show the missing external references message when the reviewed set is complete', () => {
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
        },
        {
          id: 'camara-proposicao-100-technical',
          type: 'technical',
          label: 'Referência técnica',
          title: 'Nota técnica revisada',
          publisher: 'Instituição técnica',
          url: 'https://example.com/tecnica/proposicao',
          checkedAt: '2026-06-29'
        }
      ]
    });

    expect(html).toContain('Cobertura informativa revisada');
    expect(html).toContain('Nota técnica revisada');
    expect(html).not.toContain(
      'Conjunto completo de referências externas revisadas ainda não foi adicionado para esta proposição.'
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

  it('renders the specific empty message when the official source returns no Camara votes', () => {
    const html = renderBillDetail(
      {},
      {
        showOfficialVotes: true,
        associatedVotes: []
      }
    );

    expect(html).toContain('Votações da Câmara');
    expect(html).toContain(
      'A fonte oficial da Câmara retornou lista vazia de votações para esta proposição.'
    );
    expect(html).not.toContain('Nenhuma votação foi retornada pela fonte oficial consultada.');
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
        unavailableVotesTitle: 'Votações nominais do Senado ainda não conectadas nesta versão.',
        unavailableVotesDescription:
          'Ainda não conectado nesta versão. Exige backend futuro para consulta completa.'
      }
    );

    expect(html).toContain('Votações do Senado');
    expect(html).toContain('Votações nominais do Senado ainda não conectadas nesta versão.');
    expect(html).toContain(
      'Ainda não conectado nesta versão. Exige backend futuro para consulta completa.'
    );
    expect(html).not.toContain('Votações da Câmara');
  });
});
