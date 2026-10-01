<script lang="ts">
  import { onDestroy } from 'svelte';
  import AppSidebar from './AppSidebar.svelte';
  import AboutPrivacyInfo from '$lib/components/about/AboutPrivacyInfo.svelte';
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import ConversationLog from '$lib/components/conversation/ConversationLog.svelte';
  import ParliamentarianDetail from '$lib/components/parliamentarians/ParliamentarianDetail.svelte';
  import BillDetail from '$lib/components/proposals/BillDetail.svelte';
  import ParliamentarianBills from '$lib/components/proposals/ParliamentarianBills.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import BillVotes from '$lib/components/votes/BillVotes.svelte';
  import ParliamentarianVotes from '$lib/components/votes/ParliamentarianVotes.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import {
    chatStore,
    executeSearch,
    goBack,
    navigateTo,
    officialParliamentarianSessionVotesEmptyMessage,
    officialParliamentarianSessionVotesCoverageMessage,
    officialParliamentarianStaticCoverageDescription,
    officialSenadoAssociatedMattersEmptyMessage,
    officialSenadoAssociatedMattersUnavailableDescription,
    officialSenadoProposalVotesEmptyMessage,
    openParliamentarianBills,
    openParliamentarianVotes,
    reset,
    selectParliamentarianById,
    selectProposalById,
    selectVoteById
  } from '$lib/state/chatStore';
  import {
    isOfficialCamaraProposal,
    isOfficialParliamentarian,
    isOfficialSenadoProposal,
    toParliamentarianBillView,
    toParliamentarianBillViews,
    toParliamentarianDetailView,
    toParliamentarianVoteView,
    toParliamentarianVoteViews,
    toProposalVoteView,
    toProposalVoteViews,
    toSearchParliamentarianResult,
    toSearchProposalResult,
    type ParliamentarianBillView,
    type ParliamentarianDetailView,
    type SearchResultsView
  } from './pageViewModelMappers';

  let searchRenderKey = $state(0);
  let searchFormResetToken = $state(0);

  let submittedSearch = $derived(
    chatStore.lastQuery ? { id: searchRenderKey, query: chatStore.lastQuery } : null
  );
  let searchState = $derived(chatStore.currentState);
  let searchResults: SearchResultsView = $derived({
    parliamentarians: chatStore.parliamentariansFound.map(toSearchParliamentarianResult),
    proposals: chatStore.proposalsFound.map(toSearchProposalResult)
  });
  let selectedParliamentarian: ParliamentarianDetailView | null = $derived(
    chatStore.selectedParliamentarian
      ? toParliamentarianDetailView(chatStore.selectedParliamentarian)
      : null
  );
  let selectedBill: ParliamentarianBillView | null = $derived(
    chatStore.selectedProposal
      ? toParliamentarianBillView(
          chatStore.selectedProposal,
          chatStore.selectedParliamentarian?.id
        )
      : null
  );
  let selectedVote: ParliamentarianVoteView | null = $derived(
    chatStore.selectedVote
      ? chatStore.selectedParliamentarian
        ? toParliamentarianVoteView(chatStore.selectedVote, chatStore.selectedParliamentarian)
        : toProposalVoteView(chatStore.selectedVote)
      : null
  );
  let selectedParliamentarianBills: ParliamentarianBillView[] = $derived(
    toParliamentarianBillViews(
      chatStore.parliamentarianProposals,
      chatStore.selectedParliamentarian
    )
  );
  let selectedParliamentarianVotes: ParliamentarianVoteView[] = $derived(
    toParliamentarianVoteViews(chatStore.voteHistory, chatStore.selectedParliamentarian)
  );
  let selectedParliamentarianIsOfficial = $derived(
    chatStore.selectedParliamentarian
      ? isOfficialParliamentarian(chatStore.selectedParliamentarian)
      : false
  );
  let selectedParliamentarianIsOfficialSenado = $derived(
    selectedParliamentarianIsOfficial && chatStore.selectedParliamentarian?.source === 'senado'
  );
  let selectedParliamentarianBillsEmptyTitle = $derived(
    selectedParliamentarianIsOfficialSenado
      ? officialSenadoAssociatedMattersEmptyMessage
      : undefined
  );
  let selectedParliamentarianBillsEmptyDescription = $derived(
    selectedParliamentarianIsOfficialSenado
      ? officialSenadoAssociatedMattersUnavailableDescription
      : undefined
  );
  let selectedParliamentarianVotesCoverageDescription = $derived(
    selectedParliamentarianIsOfficial && selectedParliamentarianVotes.length > 0
      ? officialParliamentarianSessionVotesCoverageMessage
      : undefined
  );
  let selectedParliamentarianVotesEmptyTitle = $derived(
    selectedParliamentarianIsOfficial
      ? officialParliamentarianSessionVotesEmptyMessage
      : undefined
  );
  let selectedParliamentarianVotesEmptyDescription = $derived(
    selectedParliamentarianIsOfficial
      ? officialParliamentarianStaticCoverageDescription
      : undefined
  );
  let selectedBillVotes: ParliamentarianVoteView[] = $derived(
    chatStore.selectedProposal
      ? chatStore.selectedParliamentarian
        ? toParliamentarianVoteViews(chatStore.voteHistory, chatStore.selectedParliamentarian)
        : toProposalVoteViews(chatStore.voteHistory)
      : []
  );
  let selectedBillShowsOfficialVotes = $derived(
    chatStore.selectedProposal
      ? isOfficialCamaraProposal(chatStore.selectedProposal) ||
        isOfficialSenadoProposal(chatStore.selectedProposal)
      : false
  );
  let selectedBillOfficialVotesTitle = $derived(
    chatStore.selectedProposal && isOfficialSenadoProposal(chatStore.selectedProposal)
      ? 'Votações do Senado'
      : 'Votações da Câmara'
  );
  let selectedBillOfficialVotesEmptyMessage = $derived(
    chatStore.selectedProposal && isOfficialSenadoProposal(chatStore.selectedProposal)
      ? officialSenadoProposalVotesEmptyMessage
      : undefined
  );
  let recoverableNotice = $derived(chatStore.errorMessage.trim());

  function handleSearch(query: string) {
    searchRenderKey += 1;
    void executeSearch(query);
  }

  function handleSelectParliamentarian(id: string) {
    void selectParliamentarianById(id);
  }

  function handleOpenParliamentarianBills() {
    void openParliamentarianBills();
  }

  function handleOpenParliamentarianVotes() {
    openParliamentarianVotes();
  }

  function handleSelectBill(id: string) {
    void selectProposalById(id);
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
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });
  }

  function handleBackToBills() {
    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_BILLS', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });
  }

  function handleBackToVotes() {
    if (selectedBill) {
      navigateTo('BILL_DETAIL', {
        updates: {
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_VOTES', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
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
        voteHistory: [],
        errorMessage: ''
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
    reset();
  });
</script>

<svelte:head>
  <title>O que o parlamentar fez</title>
</svelte:head>

<main id="conteudo" tabindex="-1" class="app">
  <AppSidebar
    onSearch={handleSearch}
    onOpenAbout={handleOpenAbout}
    resetToken={searchFormResetToken}
  />

  <ConversationLog title="Conversa de consulta" busy={searchState === 'SEARCHING'}>
    {#if searchState === 'ABOUT'}
      <ConversationBubble tone="user">
        <small>Área informativa</small>
        <strong>Sobre e privacidade</strong>
      </ConversationBubble>

      <ConversationBubble tone="status">
        <AboutPrivacyInfo onBack={handleBackFromAbout} onStartOver={handleStartOver} />
      </ConversationBubble>
    {:else if submittedSearch}
      {#key submittedSearch.id}
        <ConversationBubble tone="user">
          <small>Termo informado</small>
          <strong>{submittedSearch.query}</strong>
        </ConversationBubble>

        {#if searchState === 'SEARCHING'}
          <ConversationBubble tone="status">
            <p class="font-semibold" role="status">
              Consultando registros oficiais disponíveis.
            </p>
            <p class="mt-2 text-sm leading-6 text-ink-muted">
              Aguarde enquanto a busca consulta as fontes públicas legislativas.
            </p>
          </ConversationBubble>
        {:else if searchState === 'SEARCH_RESULTS'}
          <ConversationBubble tone="status">
            {#if recoverableNotice}
              <p
                class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                role="status"
              >
                {recoverableNotice}
              </p>
            {/if}
            <SearchResults
              query={submittedSearch.query}
              results={searchResults}
              onSelectParliamentarian={handleSelectParliamentarian}
              onSelectProposal={handleSelectBill}
            />
          </ConversationBubble>
        {:else if searchState === 'ERROR'}
          <ConversationBubble tone="status">
            <div role="alert" class="empty">
              <div>
                <b class="text-gold">!</b>
                <h3 class="font-semibold">A busca não foi concluída.</h3>
                <p class="mt-2 text-sm leading-6 text-ink-muted">
                  {chatStore.errorMessage}
                </p>
                <button
                  type="button"
                  class="btn primary mt-4"
                  onclick={handleStartOver}
                >
                  Nova consulta
                </button>
              </div>
            </div>
          </ConversationBubble>
        {:else if searchState === 'PARLIAMENTARIAN_DETAIL' && selectedParliamentarian}
          <ConversationBubble tone="user">
            <small>Parlamentar selecionado</small>
            <strong>{selectedParliamentarian.name}</strong>
          </ConversationBubble>

          <ConversationBubble tone="status">
            {#if recoverableNotice}
              <p
                class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                role="status"
              >
                {recoverableNotice}
              </p>
            {/if}
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
            <small>Consulta selecionada</small>
            <strong>Proposições de {selectedParliamentarian.name}</strong>
          </ConversationBubble>

          <ConversationBubble tone="status">
            {#if recoverableNotice}
              <p
                class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                role="status"
              >
                {recoverableNotice}
              </p>
            {/if}
            <ParliamentarianBills
              parliamentarianName={selectedParliamentarian.name}
              bills={selectedParliamentarianBills}
              emptyTitle={selectedParliamentarianBillsEmptyTitle}
              emptyDescription={selectedParliamentarianBillsEmptyDescription}
              onSelectBill={handleSelectBill}
              onBackToParliamentarian={handleBackToParliamentarian}
              onStartOver={handleStartOver}
            />
          </ConversationBubble>
        {:else if searchState === 'PARLIAMENTARIAN_VOTES' && selectedParliamentarian}
          <ConversationBubble tone="user">
            <small>Consulta selecionada</small>
            <strong>Votações disponíveis de {selectedParliamentarian.name}</strong>
          </ConversationBubble>

          <ConversationBubble tone="status">
            {#if recoverableNotice}
              <p
                class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                role="status"
              >
                {recoverableNotice}
              </p>
            {/if}
            <ParliamentarianVotes
              parliamentarianName={selectedParliamentarian.name}
              votes={selectedParliamentarianVotes}
              coverageDescription={selectedParliamentarianVotesCoverageDescription}
              emptyTitle={selectedParliamentarianVotesEmptyTitle}
              emptyDescription={selectedParliamentarianVotesEmptyDescription}
              onSelectVote={handleSelectVote}
              onBackToParliamentarian={handleBackToParliamentarian}
              onStartOver={handleStartOver}
            />
          </ConversationBubble>
        {:else if searchState === 'BILL_DETAIL' && selectedBill}
          <ConversationBubble tone="user">
            <small>Proposição selecionada</small>
            <strong>{selectedBill.identification}</strong>
          </ConversationBubble>

          <ConversationBubble tone="status">
            {#if recoverableNotice}
              <p
                class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                role="status"
              >
                {recoverableNotice}
              </p>
            {/if}
            <BillDetail
              bill={selectedBill}
              parliamentarianName={selectedParliamentarian?.name}
              associatedVotes={selectedBillVotes}
              showOfficialVotes={selectedBillShowsOfficialVotes}
              officialVotesTitle={selectedBillOfficialVotesTitle}
              officialVotesEmptyMessage={selectedBillOfficialVotesEmptyMessage}
              onSelectVote={handleSelectVote}
              onBackToBills={handleBackToBills}
              onBackToParliamentarian={handleBackToParliamentarian}
              onBackToResults={handleBackToResults}
              onStartOver={handleStartOver}
            />
          </ConversationBubble>
        {:else if searchState === 'BILL_VOTES' && selectedVote}
          <ConversationBubble tone="user">
            <small>Votação selecionada</small>
            <strong>{selectedVote.billIdentification}</strong>
          </ConversationBubble>

          <ConversationBubble tone="status">
            <BillVotes
              vote={selectedVote}
              parliamentarianName={selectedParliamentarian?.name}
              onBackToVotes={handleBackToVotes}
              onBackToParliamentarian={handleBackToParliamentarian}
              onStartOver={handleStartOver}
            />
          </ConversationBubble>
        {/if}
      {/key}
    {:else}
      <ConversationBubble>
        <div class="empty">
          <div>
            <b>?</b>
            <h3>Consulta pública de atividade parlamentar</h3>
            <p>Informe um parlamentar ou uma proposição para iniciar a consulta.</p>
          </div>
        </div>
      </ConversationBubble>
    {/if}
  </ConversationLog>
</main>

<style>
  .app {
    height: 100dvh;
    max-width: 1440px;
    margin: auto;
    padding: 16px;
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 16px;
  }

  .empty {
    height: 100%;
    display: grid;
    place-items: center;
    text-align: center;
  }

  .empty div {
    max-width: 500px;
  }

  .empty b {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin: 0 auto 9px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: #ffffff;
    color: var(--accent);
  }

  .empty h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
  }

  .empty p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }

  @media (max-width: 700px) {
    .app {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      padding: 7px;
      gap: 7px;
    }
  }
</style>
