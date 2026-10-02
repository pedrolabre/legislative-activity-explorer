import { render } from 'svelte/server';
import { beforeAll, describe, expect, it } from 'vitest';
import ConversationFlow, {
  clearPanelCache,
  preloadAllPanels,
  preloadPanel
} from './ConversationFlow.svelte';
import type {
  ParliamentarianBillView,
  ParliamentarianDetailView,
  SearchResultsView
} from './pageViewModelMappers';
import type { ParliamentarianVoteView } from '$lib/domain';

describe('ConversationFlow', () => {
  beforeAll(async () => {
    await preloadAllPanels();
  });
  const dummyHandlers = {
    onSelectParliamentarian: () => undefined,
    onSelectBill: () => undefined,
    onSelectVote: () => undefined,
    onOpenParliamentarianBills: () => undefined,
    onOpenParliamentarianVotes: () => undefined,
    onBackFromAbout: () => undefined,
    onBackToResults: () => undefined,
    onBackToParliamentarian: () => undefined,
    onBackToBills: () => undefined,
    onBackToVotes: () => undefined,
    onStartOver: () => undefined
  };

  const sampleParliamentarian: ParliamentarianDetailView = {
    id: 'camara-10',
    name: 'Deputada Teste',
    office: 'Deputada Federal',
    chamber: 'Câmara dos Deputados',
    party: 'PARTIDO',
    state: 'SP',
    status: 'Exercício'
  };

  const sampleBill: ParliamentarianBillView = {
    id: 'camara-proposicao-100',
    parliamentarianId: 'camara-10',
    identification: 'PL 100/2024',
    chamber: 'Câmara dos Deputados',
    type: 'PL',
    subject: 'Educação',
    status: 'Aprovada',
    relationship: 'Autoria principal',
    officialSummary: 'Resumo oficial do projeto de lei',
    sources: []
  };

  const sampleVote: ParliamentarianVoteView = {
    id: 'vote-100',
    parliamentarianId: 'camara-10',
    billIdentification: 'PL 100/2024',
    chamber: 'Câmara dos Deputados',
    description: 'Votação nominal em primeiro turno',
    votedAt: '2024-06-15',
    officialResult: 'Aprovado',
    counts: { yes: 350, no: 50, abstention: 0, absent: 5 },
    individualVotes: []
  };

  const emptySearchResults: SearchResultsView = {
    parliamentarians: [],
    proposals: []
  };

  it('renders welcome view when no search was submitted', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'WELCOME',
        submittedSearch: null,
        searchResults: emptySearchResults,
        selectedParliamentarian: null,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Consulta pública de atividade parlamentar');
    expect(html).toContain('Informe um parlamentar ou uma proposição para iniciar a consulta.');
  });

  it('renders about view when searchState is ABOUT', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'ABOUT',
        submittedSearch: null,
        searchResults: emptySearchResults,
        selectedParliamentarian: null,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Área informativa');
    expect(html).toContain('Sobre e privacidade');
    expect(html).toContain('Sobre, privacidade e responsabilidade');
  });

  it('renders searching view with user query bubble', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'SEARCHING',
        submittedSearch: { id: 1, query: 'Tabata Amaral' },
        searchResults: emptySearchResults,
        selectedParliamentarian: null,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Termo informado');
    expect(html).toContain('Tabata Amaral');
    expect(html).toContain('Consultando registros oficiais disponíveis.');
  });

  it('renders search results view and recoverable notices', () => {
    const searchResults: SearchResultsView = {
      parliamentarians: [
        {
          kind: 'parliamentarian',
          id: 'camara-10',
          name: 'Deputada Teste',
          office: 'Deputada Federal',
          chamber: 'Câmara dos Deputados',
          party: 'PARTIDO',
          state: 'SP',
          status: 'Exercício',
          searchTerms: []
        }
      ],
      proposals: []
    };

    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'SEARCH_RESULTS',
        submittedSearch: { id: 1, query: 'Deputada Teste' },
        recoverableNotice: 'Aviso: busca no Senado indisponível no momento.',
        searchResults,
        selectedParliamentarian: null,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Termo informado');
    expect(html).toContain('Deputada Teste');
    expect(html).toContain('Aviso: busca no Senado indisponível no momento.');
    expect(html).toContain('Resultado da busca');
    expect(html).toContain('Parlamentares');
  });

  it('renders error view with error message and restart action', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'ERROR',
        submittedSearch: { id: 1, query: 'Consulta com erro' },
        errorMessage: 'Falha na conexão com a API da Câmara.',
        searchResults: emptySearchResults,
        selectedParliamentarian: null,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Termo informado');
    expect(html).toContain('A busca não foi concluída.');
    expect(html).toContain('Falha na conexão com a API da Câmara.');
    expect(html).toContain('Nova consulta');
  });

  it('renders parliamentarian detail view', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'PARLIAMENTARIAN_DETAIL',
        submittedSearch: { id: 1, query: 'Deputada Teste' },
        searchResults: emptySearchResults,
        selectedParliamentarian: sampleParliamentarian,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Parlamentar selecionado');
    expect(html).toContain('Deputada Teste');
    expect(html).toContain('Proposições');
    expect(html).toContain('Votações');
  });

  it('renders parliamentarian bills view with feedback messages', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'PARLIAMENTARIAN_BILLS',
        submittedSearch: { id: 1, query: 'Deputada Teste' },
        searchResults: emptySearchResults,
        selectedParliamentarian: sampleParliamentarian,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [sampleBill],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        billsFeedback: {},
        ...dummyHandlers
      }
    });

    expect(html).toContain('Consulta selecionada');
    expect(html).toContain('Proposições de Deputada Teste');
    expect(html).toContain('PL 100/2024');
  });

  it('renders parliamentarian votes view', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'PARLIAMENTARIAN_VOTES',
        submittedSearch: { id: 1, query: 'Deputada Teste' },
        searchResults: emptySearchResults,
        selectedParliamentarian: sampleParliamentarian,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [sampleVote],
        selectedBillVotes: [],
        votesFeedback: { coverageDescription: 'Cobertura parcial de votos nesta sessão.' },
        ...dummyHandlers
      }
    });

    expect(html).toContain('Consulta selecionada');
    expect(html).toContain('Votações disponíveis de Deputada Teste');
    expect(html).toContain('PL 100/2024');
  });

  it('renders bill detail view', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'BILL_DETAIL',
        submittedSearch: { id: 1, query: 'PL 100/2024' },
        searchResults: emptySearchResults,
        selectedParliamentarian: sampleParliamentarian,
        selectedBill: sampleBill,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [sampleVote],
        proposalVotesFeedback: {
          showOfficialVotes: true,
          officialVotesTitle: 'Votações da Câmara'
        },
        ...dummyHandlers
      }
    });

    expect(html).toContain('Proposição selecionada');
    expect(html).toContain('PL 100/2024');
    expect(html).toContain('Resumo oficial do projeto de lei');
  });

  it('renders bill votes view', () => {
    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'BILL_VOTES',
        submittedSearch: { id: 1, query: 'PL 100/2024' },
        searchResults: emptySearchResults,
        selectedParliamentarian: sampleParliamentarian,
        selectedBill: sampleBill,
        selectedVote: sampleVote,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Votação selecionada');
    expect(html).toContain('PL 100/2024');
    expect(html).toContain('Votação nominal em primeiro turno');
  });

  it('renders loading skeleton with proper ARIA attributes when panel is not cached', () => {
    clearPanelCache();

    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'ABOUT',
        submittedSearch: null,
        searchResults: emptySearchResults,
        selectedParliamentarian: null,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('data-testid="panel-loading-skeleton"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Carregando Sobre e privacidade...');
  });

  it('renders loading skeleton for parliamentarian detail when not preloaded', () => {
    clearPanelCache();

    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'PARLIAMENTARIAN_DETAIL',
        submittedSearch: { id: 1, query: 'Deputada Teste' },
        searchResults: emptySearchResults,
        selectedParliamentarian: sampleParliamentarian,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Parlamentar selecionado');
    expect(html).toContain('Deputada Teste');
    expect(html).toContain('data-testid="panel-loading-skeleton"');
    expect(html).toContain('aria-label="Carregando Deputada Teste..."');
  });

  it('renders fully resolved panel after preloading individual panel', async () => {
    clearPanelCache();
    await preloadPanel('ABOUT');

    const { body: html } = render(ConversationFlow, {
      props: {
        searchState: 'ABOUT',
        submittedSearch: null,
        searchResults: emptySearchResults,
        selectedParliamentarian: null,
        selectedBill: null,
        selectedVote: null,
        selectedParliamentarianBills: [],
        selectedParliamentarianVotes: [],
        selectedBillVotes: [],
        ...dummyHandlers
      }
    });

    expect(html).toContain('Área informativa');
    expect(html).toContain('Sobre e privacidade');
    expect(html).toContain('Sobre, privacidade e responsabilidade');
    expect(html).not.toContain('data-testid="panel-loading-skeleton"');
  });
});
