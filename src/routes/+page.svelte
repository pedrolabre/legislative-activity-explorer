<script lang="ts">
  import { onDestroy } from 'svelte';
  import AboutPrivacyInfo from '$lib/components/about/AboutPrivacyInfo.svelte';
  import ProductLogo from '$lib/components/brand/ProductLogo.svelte';
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import ConversationLog from '$lib/components/conversation/ConversationLog.svelte';
  import ParliamentarianDetail from '$lib/components/parliamentarians/ParliamentarianDetail.svelte';
  import BillDetail from '$lib/components/proposals/BillDetail.svelte';
  import ParliamentarianBills from '$lib/components/proposals/ParliamentarianBills.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import InitialSearchForm from '$lib/components/search/InitialSearchForm.svelte';
  import BillVotes from '$lib/components/votes/BillVotes.svelte';
  import ParliamentarianVotes from '$lib/components/votes/ParliamentarianVotes.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import {
    chatStore,
    executeSearch,
    goBack,
    initialChatContext,
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
    selectVoteById,
    type ChatContext
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

  let chatContext = $state<ChatContext>(initialChatContext);
  let searchRenderKey = $state(0);
  let searchFormResetToken = $state(0);
  const unsubscribeChatStore = chatStore.subscribe((context) => {
    chatContext = context;
  });


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
    chatContext.selectedProposal
      ? toParliamentarianBillView(
          chatContext.selectedProposal,
          chatContext.selectedParliamentarian?.id
        )
      : null
  );
  let selectedVote: ParliamentarianVoteView | null = $derived(
    chatContext.selectedVote
      ? chatContext.selectedParliamentarian
        ? toParliamentarianVoteView(chatContext.selectedVote, chatContext.selectedParliamentarian)
        : toProposalVoteView(chatContext.selectedVote)
      : null
  );
  let selectedParliamentarianBills: ParliamentarianBillView[] = $derived(
    toParliamentarianBillViews(
      chatContext.parliamentarianProposals,
      chatContext.selectedParliamentarian
    )
  );
  let selectedParliamentarianVotes: ParliamentarianVoteView[] = $derived(
    toParliamentarianVoteViews(chatContext.voteHistory, chatContext.selectedParliamentarian)
  );
  let selectedParliamentarianIsOfficial = $derived(
    chatContext.selectedParliamentarian
      ? isOfficialParliamentarian(chatContext.selectedParliamentarian)
      : false
  );
  let selectedParliamentarianIsOfficialSenado = $derived(
    selectedParliamentarianIsOfficial && chatContext.selectedParliamentarian?.source === 'senado'
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
    chatContext.selectedProposal
      ? chatContext.selectedParliamentarian
        ? toParliamentarianVoteViews(chatContext.voteHistory, chatContext.selectedParliamentarian)
        : toProposalVoteViews(chatContext.voteHistory)
      : []
  );
  let selectedBillShowsOfficialVotes = $derived(
    chatContext.selectedProposal
      ? isOfficialCamaraProposal(chatContext.selectedProposal) ||
        isOfficialSenadoProposal(chatContext.selectedProposal)
      : false
  );
  let selectedBillOfficialVotesTitle = $derived(
    chatContext.selectedProposal && isOfficialSenadoProposal(chatContext.selectedProposal)
      ? 'Votações do Senado'
      : 'Votações da Câmara'
  );
  let selectedBillOfficialVotesEmptyMessage = $derived(
    chatContext.selectedProposal && isOfficialSenadoProposal(chatContext.selectedProposal)
      ? officialSenadoProposalVotesEmptyMessage
      : undefined
  );
  let recoverableNotice = $derived(chatContext.errorMessage.trim());

  let sideMaximized = $state(false);
  let sideElement = $state<HTMLElement | null>(null);
  let touchStartY = 0;

  function toggleSideMaximized() {
    sideMaximized = !sideMaximized;
  }

  function handleBrandClick() {
    if (typeof window !== 'undefined' && window.innerWidth <= 700 && !sideMaximized) {
      sideMaximized = true;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (typeof window !== 'undefined' && window.innerWidth > 700) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchEndY - touchStartY;
    if (diffY > 30 && !sideMaximized) {
      sideMaximized = true;
    } else if (diffY < -30 && sideMaximized) {
      sideMaximized = false;
    }
  }

  function handleWindowClick(e: MouseEvent) {
    if (typeof window !== 'undefined' && window.innerWidth <= 700 && sideMaximized) {
      const target = e.target as Node | null;
      if (sideElement && target && !sideElement.contains(target)) {
        sideMaximized = false;
      }
    }
  }

  function handleSearch(query: string) {
    sideMaximized = false;
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
    sideMaximized = false;
    reset();
    searchRenderKey += 1;
    searchFormResetToken += 1;
  }

  onDestroy(() => {
    unsubscribeChatStore();
    reset();
  });
</script>

<svelte:window onclick={handleWindowClick} />

<svelte:head>
  <title>O que o parlamentar fez</title>
</svelte:head>

<main id="conteudo" tabindex="-1" class="app">
  <aside
    bind:this={sideElement}
    id="side"
    class={`side ${sideMaximized ? 'is-maximized' : ''}`}
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
    aria-label="Barra lateral de consulta"
  >
    <div
      class="brand"
      role="button"
      tabindex="0"
      onclick={handleBrandClick}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleBrandClick();
        }
      }}
    >
      <ProductLogo showText={false} decorative class="brand-logo" />
      <div>
        <h1 id="home-title">O que o parlamentar fez</h1>
      </div>
    </div>

    <p class="intro">
      <strong>Consulte projetos e votações</strong> do Congresso Nacional a partir de registros oficiais disponíveis.
    </p>

    <InitialSearchForm onSearch={handleSearch} resetToken={searchFormResetToken} />

    <div class="side-bottom">
      <button
        type="button"
        class="btn secondary wide"
        onclick={handleOpenAbout}
      >
        Sobre e privacidade
      </button>
    </div>

    <button
      id="sideHandle"
      class="side-handle"
      type="button"
      aria-label={sideMaximized ? 'Deslizar para recolher' : 'Deslizar para expandir'}
      aria-expanded={sideMaximized}
      onclick={toggleSideMaximized}
    >
      <span class="handle-track">
        <span class="handle-line"></span>
        <span class="handle-line"></span>
        <span class="handle-line"></span>
      </span>
    </button>
  </aside>

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
                  {chatContext.errorMessage}
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

  .side {
    min-height: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(23, 32, 39, 0.06);
    background: var(--white);
    border-top: 4px solid var(--gold);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
  }

  .side-handle {
    display: none;
  }

  .brand {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .brand h1 {
    margin: 0;
    font-size: 18px;
    line-height: 1.15;
    font-weight: 650;
    color: var(--ink);
  }

  .intro {
    margin: 14px 0 0;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }

  .intro strong {
    color: var(--ink);
  }

  .side-bottom {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--border);
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

    .side {
      padding: 8px 10px 4px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
      grid-template-areas:
        "brand form"
        "handle handle";
      gap: 4px 8px;
      align-items: center;
      border-top-width: 3px;
      transition: background-color 0.15s ease;
    }

    .brand {
      grid-area: brand;
      display: flex;
      gap: 7px;
      align-items: center;
      min-width: 0;
      overflow: hidden;
      cursor: pointer;
    }

    .brand h1 {
      font-size: 11px;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    .intro,
    .side-bottom {
      display: none;
    }

    .side-handle {
      grid-area: handle;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      padding: 4px 0 2px;
      background: transparent;
      border: 0;
      cursor: pointer;
      touch-action: manipulation;
    }

    .handle-track {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2.5px;
      padding: 3px 18px;
      border-radius: 99px;
      background: rgba(204, 216, 211, 0.45);
      transition: all 0.15s ease;
    }

    .side-handle:hover .handle-track,
    .side-handle:active .handle-track {
      background: rgba(0, 95, 115, 0.12);
    }

    .handle-line {
      display: block;
      height: 2px;
      background: var(--muted);
      border-radius: 99px;
      transition: background-color 0.15s ease, width 0.15s ease;
    }

    .handle-line:nth-child(1) {
      width: 22px;
    }

    .handle-line:nth-child(2) {
      width: 26px;
    }

    .handle-line:nth-child(3) {
      width: 22px;
    }

    .side-handle:hover .handle-line,
    .side-handle:active .handle-line {
      background: var(--accent);
    }

    .side.is-maximized {
      display: flex;
      flex-direction: column;
      padding: 14px 13px 6px;
      gap: 0;
      border-top-width: 4px;
      box-shadow: 0 3px 14px rgba(23, 32, 39, 0.1);
    }

    .side.is-maximized .brand {
      gap: 10px;
      overflow: visible;
    }

    .side.is-maximized .brand h1 {
      font-size: 16px;
      line-height: 1.2;
      white-space: normal;
    }

    .side.is-maximized .intro {
      display: block;
      margin: 12px 0 0;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      line-height: 1.45;
      color: var(--muted);
    }

    .side.is-maximized .side-bottom {
      display: block;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .side.is-maximized .side-bottom :global(.btn) {
      width: 100%;
      min-height: 36px;
      font-size: 11px;
    }

    .side.is-maximized .side-handle {
      margin-top: 8px;
      padding: 6px 0 2px;
    }
  }
</style>
