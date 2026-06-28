<script lang="ts">
  import { onDestroy } from 'svelte';
  import AboutPrivacyInfo from '$lib/components/about/AboutPrivacyInfo.svelte';
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import ConversationLog from '$lib/components/conversation/ConversationLog.svelte';
  import ParliamentarianDetail from '$lib/components/parliamentarians/ParliamentarianDetail.svelte';
  import BillDetail from '$lib/components/proposals/BillDetail.svelte';
  import ParliamentarianBills from '$lib/components/proposals/ParliamentarianBills.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import InitialSearchForm from '$lib/components/search/InitialSearchForm.svelte';
  import BillVotes from '$lib/components/votes/BillVotes.svelte';
  import ParliamentarianVotes from '$lib/components/votes/ParliamentarianVotes.svelte';
  import type {
    LegislativeProposal,
    Parliamentarian,
    RollCallVote,
    VotePosition
  } from '$lib/domain';
  import {
    chatStore,
    executeSearch,
    goBack,
    initialChatContext,
    navigateTo,
    openParliamentarianBills,
    openParliamentarianVotes,
    reset,
    selectParliamentarianById,
    selectProposalById,
    selectVoteById,
    type ChatContext
  } from '$lib/state/chatStore';

  const unavailableSearchFieldLabel = 'Não disponível';
  const unavailableDetailFieldLabel = 'Não disponível nesta visualização.';

  type DisplayVotePosition = 'SIM' | 'NÃO' | 'ABSTENÇÃO' | 'AUSENTE';

  interface SearchResultsView {
    parliamentarians: {
      kind: 'parliamentarian';
      id: string;
      name: string;
      office: string;
      party: string;
      state: string;
      status: string;
      searchTerms: string[];
    }[];
    proposals: {
      kind: 'proposal';
      id: string;
      title: string;
      chamber: string;
      subject: string;
      status: string;
      searchTerms: string[];
    }[];
  }

  interface ParliamentarianDetailView {
    id: string;
    name: string;
    fullName?: string;
    office: string;
    chamber: string;
    party: string;
    state: string;
    status: string;
    term?: string;
    email?: string;
    photoUrl?: string;
  }

  interface ParliamentarianBillView {
    id: string;
    parliamentarianId: string;
    identification: string;
    chamber: string;
    subject: string;
    status: string;
    relationship: string;
    presentedAt?: string;
    officialSummary: string;
    factualSummary?: string;
    sources: {
      id: string;
      type: 'official' | 'institutional';
      label: string;
      title: string;
      publisher: string;
      url: string;
    }[];
  }

  interface ParliamentarianVoteView {
    id: string;
    parliamentarianId: string;
    billIdentification: string;
    chamber: string;
    description: string;
    parliamentarianVote: DisplayVotePosition;
    votedAt?: string;
    officialResult?: string;
    counts?: {
      yes: number;
      no: number;
      abstention: number;
      absent: number;
    };
    individualVotes: {
      parliamentarianName: string;
      party: string;
      state: string;
      vote: DisplayVotePosition;
    }[];
  }

  let chatContext = $state<ChatContext>(initialChatContext);
  let searchRenderKey = $state(0);
  let searchFormResetToken = $state(0);
  const unsubscribeChatStore = chatStore.subscribe((context) => {
    chatContext = context;
  });

  function getChamberLabel(source: Parliamentarian['source'] | LegislativeProposal['source']) {
    return source === 'senado' ? 'Senado Federal' : 'Câmara dos Deputados';
  }

  function toSearchParliamentarianResult(parliamentarian: Parliamentarian) {
    return {
      kind: 'parliamentarian' as const,
      id: parliamentarian.id,
      name: parliamentarian.name,
      office: parliamentarian.office,
      party: parliamentarian.party ?? unavailableSearchFieldLabel,
      state: parliamentarian.state ?? unavailableSearchFieldLabel,
      status: parliamentarian.status ?? unavailableSearchFieldLabel,
      searchTerms: []
    };
  }

  function toSearchProposalResult(proposal: LegislativeProposal) {
    return {
      kind: 'proposal' as const,
      id: proposal.id,
      title: proposal.title,
      chamber: getChamberLabel(proposal.source),
      subject: proposal.subject ?? unavailableSearchFieldLabel,
      status: proposal.status ?? unavailableSearchFieldLabel,
      searchTerms: []
    };
  }

  function toParliamentarianDetailView(
    parliamentarian: Parliamentarian
  ): ParliamentarianDetailView {
    return {
      id: parliamentarian.id,
      name: parliamentarian.name,
      fullName: parliamentarian.fullName,
      office: parliamentarian.office,
      chamber: getChamberLabel(parliamentarian.source),
      party: parliamentarian.party ?? unavailableDetailFieldLabel,
      state: parliamentarian.state ?? unavailableDetailFieldLabel,
      status: parliamentarian.status ?? unavailableDetailFieldLabel,
      term: parliamentarian.term,
      email: parliamentarian.email,
      photoUrl: parliamentarian.photoUrl
    };
  }

  function getReferenceLabel(reference: LegislativeProposal['references'][number]) {
    if (reference.type === 'official') {
      return 'Fonte oficial';
    }

    if (reference.type === 'press') {
      return 'Cobertura de imprensa';
    }

    return 'Referência institucional';
  }

  function toParliamentarianBillView(
    proposal: LegislativeProposal,
    parliamentarianId: string
  ): ParliamentarianBillView {
    return {
      id: proposal.id,
      parliamentarianId,
      identification: proposal.title,
      chamber: getChamberLabel(proposal.source),
      subject: proposal.subject ?? unavailableDetailFieldLabel,
      status: proposal.status ?? unavailableDetailFieldLabel,
      relationship: proposal.relationship ?? unavailableDetailFieldLabel,
      presentedAt: proposal.presentedAt,
      officialSummary: proposal.officialSummary ?? unavailableDetailFieldLabel,
      factualSummary: proposal.simplifiedSummary,
      sources: proposal.references.map((reference) => ({
        id: reference.id,
        type: reference.type === 'official' ? 'official' : 'institutional',
        label: getReferenceLabel(reference),
        title: reference.title,
        publisher: reference.publisher,
        url: reference.url
      }))
    };
  }

  function toDisplayVotePosition(vote: VotePosition): DisplayVotePosition {
    if (vote === 'NAO') {
      return 'NÃO';
    }

    if (vote === 'ABSTENCAO') {
      return 'ABSTENÇÃO';
    }

    return vote;
  }

  function normalizeName(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }

  function getParliamentarianVote(
    vote: RollCallVote,
    parliamentarian: Parliamentarian
  ): DisplayVotePosition {
    const normalizedParliamentarianName = normalizeName(parliamentarian.name);
    const individualVote = vote.individualVotes.find(
      (currentVote) =>
        normalizeName(currentVote.parliamentarianName) === normalizedParliamentarianName
    );

    return individualVote ? toDisplayVotePosition(individualVote.vote) : 'AUSENTE';
  }

  function toParliamentarianVoteView(
    vote: RollCallVote,
    parliamentarian: Parliamentarian
  ): ParliamentarianVoteView {
    return {
      id: vote.id,
      parliamentarianId: parliamentarian.id,
      billIdentification: vote.proposalId,
      chamber: getChamberLabel(vote.source),
      description: vote.description,
      parliamentarianVote: getParliamentarianVote(vote, parliamentarian),
      votedAt: vote.votedAt,
      officialResult: vote.result,
      counts: vote.counts,
      individualVotes: vote.individualVotes.map((individualVote) => ({
        parliamentarianName: individualVote.parliamentarianName,
        party: individualVote.party ?? unavailableDetailFieldLabel,
        state: individualVote.state ?? unavailableDetailFieldLabel,
        vote: toDisplayVotePosition(individualVote.vote)
      }))
    };
  }

  let submittedSearch = $derived(
    chatContext.lastQuery ? { id: searchRenderKey, query: chatContext.lastQuery } : null
  );
  let searchState = $derived(chatContext.currentState);
  let searchResults: SearchResultsView = $derived({
    parliamentarians: chatContext.parliamentariansFound.map(toSearchParliamentarianResult),
    proposals: chatContext.proposalsFound.map(toSearchProposalResult)
  });
  let selectedParliamentarian: ParliamentarianDetailView | null = $derived(
    chatContext.selectedParliamentarian
      ? toParliamentarianDetailView(chatContext.selectedParliamentarian)
      : null
  );
  let selectedBill: ParliamentarianBillView | null = $derived(
    chatContext.selectedProposal && chatContext.selectedParliamentarian
      ? toParliamentarianBillView(
          chatContext.selectedProposal,
          chatContext.selectedParliamentarian.id
        )
      : null
  );
  let selectedVote: ParliamentarianVoteView | null = $derived(
    chatContext.selectedVote && chatContext.selectedParliamentarian
      ? toParliamentarianVoteView(chatContext.selectedVote, chatContext.selectedParliamentarian)
      : null
  );
  let selectedParliamentarianBills: ParliamentarianBillView[] = $derived(
    chatContext.selectedParliamentarian
      ? chatContext.parliamentarianProposals.map((proposal) =>
          toParliamentarianBillView(proposal, chatContext.selectedParliamentarian!.id)
        )
      : []
  );
  let selectedParliamentarianVotes: ParliamentarianVoteView[] = $derived(
    chatContext.selectedParliamentarian
      ? chatContext.voteHistory.map((vote) =>
          toParliamentarianVoteView(vote, chatContext.selectedParliamentarian!)
        )
      : []
  );

  function handleSearch(query: string) {
    searchRenderKey += 1;
    void executeSearch(query);
  }

  function handleSelectParliamentarian(id: string) {
    selectParliamentarianById(id);
  }

  function handleOpenParliamentarianBills() {
    openParliamentarianBills();
  }

  function handleOpenParliamentarianVotes() {
    openParliamentarianVotes();
  }

  function handleSelectBill(id: string) {
    selectProposalById(id);
  }

  function handleSelectVote(id: string) {
    selectVoteById(id);
  }

  function handleOpenAbout() {
    navigateTo('ABOUT');
  }

  function handleBackFromAbout() {
    goBack();
  }

  function handleBackToParliamentarian() {
    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedProposal: null,
        selectedVote: null
      },
      recordHistory: false
    });
  }

  function handleBackToBills() {
    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_BILLS', {
      updates: {
        selectedProposal: null,
        selectedVote: null
      },
      recordHistory: false
    });
  }

  function handleBackToVotes() {
    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_VOTES', {
      updates: {
        selectedProposal: null,
        selectedVote: null
      },
      recordHistory: false
    });
  }

  function handleBackToResults() {
    navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
      updates: {
        selectedParliamentarian: null,
        parliamentarianProposals: [],
        selectedProposal: null,
        selectedVote: null,
        voteHistory: []
      },
      recordHistory: false
    });
  }

  function handleStartOver() {
    reset();
    searchRenderKey += 1;
    searchFormResetToken += 1;
  }

  onDestroy(() => {
    unsubscribeChatStore();
    reset();
  });
</script>

<svelte:head>
  <title>O que o parlamentar fez</title>
</svelte:head>

<main id="conteudo" class="min-h-dvh px-page py-section">
  <section
    class="mx-auto grid min-h-[calc(100dvh-6rem)] w-full max-w-shell content-center gap-10 border-t-4 border-civic pt-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:items-center"
    aria-labelledby="home-title"
  >
    <div class="max-w-readable">
      <p class="text-kicker font-bold uppercase tracking-normal text-accent">Consulta pública</p>
      <h1
        id="home-title"
        class="mt-4 max-w-[12ch] text-4xl font-semibold leading-none tracking-normal text-ink sm:text-6xl md:text-7xl"
      >
        O que o parlamentar fez
      </h1>
      <div class="mt-8 space-y-4 text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
        <p class="text-lead font-medium text-ink">
          Consulta pública sobre projetos e votações do Congresso Nacional.
        </p>
        <p>
          Um explorador de dados construído sobre registros legislativos públicos, com foco em
          clareza, neutralidade e privacidade.
        </p>
      </div>

      <div class="mt-10">
        <InitialSearchForm onSearch={handleSearch} resetToken={searchFormResetToken} />
      </div>

      <div class="mt-4">
        <button
          type="button"
          class="min-h-12 rounded-ui border border-border bg-surface-raised px-4 py-3 text-sm font-bold text-ink transition hover:border-accent"
          onclick={handleOpenAbout}
        >
          Sobre e privacidade
        </button>
      </div>
    </div>

    <ConversationLog title="Conversa de consulta">
      <ConversationBubble>
        <p>Informe um parlamentar ou uma proposição para iniciar a consulta.</p>
      </ConversationBubble>

      {#if searchState === 'ABOUT'}
        <ConversationBubble tone="user">
          <p class="text-xs font-bold uppercase tracking-normal opacity-80">Área informativa</p>
          <p class="mt-1">Sobre e privacidade</p>
        </ConversationBubble>

        <ConversationBubble tone="status">
          <AboutPrivacyInfo onBack={handleBackFromAbout} onStartOver={handleStartOver} />
        </ConversationBubble>
      {:else if submittedSearch}
        {#key submittedSearch.id}
          <ConversationBubble tone="user">
            <p class="text-xs font-bold uppercase tracking-normal opacity-80">Termo informado</p>
            <p class="mt-1 break-words">{submittedSearch.query}</p>
          </ConversationBubble>

          {#if searchState === 'SEARCHING'}
            <ConversationBubble tone="status">
              <p class="font-semibold" role="status">Verificando correspondências nesta página.</p>
              <p class="mt-2 text-sm leading-6 text-ink-muted">
                Nenhum dado oficial foi consultado.
              </p>
            </ConversationBubble>
          {:else if searchState === 'SEARCH_RESULTS'}
            <ConversationBubble tone="status">
              <SearchResults
                query={submittedSearch.query}
                results={searchResults}
                onSelectParliamentarian={handleSelectParliamentarian}
              />
            </ConversationBubble>
          {:else if searchState === 'ERROR'}
            <ConversationBubble tone="status">
              <p class="font-semibold" role="status">A busca não foi concluída.</p>
              <p class="mt-2 text-sm leading-6 text-ink-muted">
                {chatContext.errorMessage}
              </p>
              <button
                type="button"
                class="mt-4 min-h-12 rounded-ui bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-strong"
                onclick={handleStartOver}
              >
                Nova consulta
              </button>
            </ConversationBubble>
          {:else if searchState === 'PARLIAMENTARIAN_DETAIL' && selectedParliamentarian}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Parlamentar selecionado
              </p>
              <p class="mt-1 break-words">{selectedParliamentarian.name}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              <ParliamentarianDetail
                parliamentarian={selectedParliamentarian}
                onOpenBills={handleOpenParliamentarianBills}
                onOpenVotes={handleOpenParliamentarianVotes}
                onBackToResults={handleBackToResults}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'PARLIAMENTARIAN_BILLS' && selectedParliamentarian}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Consulta selecionada
              </p>
              <p class="mt-1 break-words">Proposições de {selectedParliamentarian.name}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              <ParliamentarianBills
                parliamentarianName={selectedParliamentarian.name}
                bills={selectedParliamentarianBills}
                onSelectBill={handleSelectBill}
                onBackToParliamentarian={handleBackToParliamentarian}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'PARLIAMENTARIAN_VOTES' && selectedParliamentarian}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Consulta selecionada
              </p>
              <p class="mt-1 break-words">Votações de {selectedParliamentarian.name}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              <ParliamentarianVotes
                parliamentarianName={selectedParliamentarian.name}
                votes={selectedParliamentarianVotes}
                onSelectVote={handleSelectVote}
                onBackToParliamentarian={handleBackToParliamentarian}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'BILL_DETAIL' && selectedParliamentarian && selectedBill}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Proposição selecionada
              </p>
              <p class="mt-1 break-words">{selectedBill.identification}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              <BillDetail
                bill={selectedBill}
                parliamentarianName={selectedParliamentarian.name}
                onBackToBills={handleBackToBills}
                onBackToParliamentarian={handleBackToParliamentarian}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'BILL_VOTES' && selectedParliamentarian && selectedVote}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Votação selecionada
              </p>
              <p class="mt-1 break-words">{selectedVote.billIdentification}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              <BillVotes
                vote={selectedVote}
                parliamentarianName={selectedParliamentarian.name}
                onBackToVotes={handleBackToVotes}
                onBackToParliamentarian={handleBackToParliamentarian}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {/if}
        {/key}
      {/if}
    </ConversationLog>
  </section>
</main>
