<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import AppSidebar from './AppSidebar.svelte';
  import ConversationFlow from './ConversationFlow.svelte';
  import ConversationLog from '$lib/components/conversation/ConversationLog.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import {
    chatStore,
    executeSearch,
    goBack,
    navigateTo,
    openParliamentarianBills,
    openParliamentarianVotes,
    reset,
    selectParliamentarianById,
    selectProposalById,
    selectVoteById
  } from '$lib/state/chatStore';
  import {
    applyDeepLink,
    handlePopStateNavigation,
    isTransientNavigationState,
    registerPopstateListener,
    syncUrlWithState
  } from '$lib/services/urlNavigationService';
  import {
    getParliamentarianBillsFeedback,
    getParliamentarianVotesFeedback,
    getProposalVotesFeedback,
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
  let hasInitializedFromUrl = false;
  let isPopstateNavigation = false;
  let isMounted = false;
  let cleanupPopstateListener: (() => void) | null = null;

  onMount(() => {
    isMounted = true;

    if (!hasInitializedFromUrl && typeof window !== 'undefined' && window.location.search) {
      hasInitializedFromUrl = true;
      void applyDeepLink(window.location.search, {
        searchFn: async (query) => {
          searchRenderKey += 1;
          await executeSearch(query);
        },
        selectProposalFn: selectProposalById,
        selectParliamentarianFn: selectParliamentarianById,
        getCurrentState: () => chatStore.currentState
      });
    }

    cleanupPopstateListener = registerPopstateListener(async () => {
      await handlePopStateNavigation({
        searchFn: async (query) => {
          searchRenderKey += 1;
          await executeSearch(query);
        },
        selectProposalFn: selectProposalById,
        selectParliamentarianFn: selectParliamentarianById,
        resetFn: () => {
          reset();
          searchRenderKey += 1;
          searchFormResetToken += 1;
        },
        getCurrentState: () => chatStore.currentState,
        onNavigationStart: () => {
          isPopstateNavigation = true;
        },
        onNavigationEnd: () => {
          isPopstateNavigation = false;
        }
      });
    });

    return () => {
      cleanupPopstateListener?.();
      cleanupPopstateListener = null;
    };
  });

  $effect(() => {
    const currentState = chatStore.currentState;
    const lastQuery = chatStore.lastQuery;
    const selectedParliamentarianId = chatStore.selectedParliamentarian?.id;
    const selectedProposalId = chatStore.selectedProposal?.id;

    if (!isMounted || isPopstateNavigation) {
      return;
    }

    if (isTransientNavigationState(currentState)) {
      return;
    }

    syncUrlWithState({
      currentState,
      lastQuery,
      selectedParliamentarianId,
      selectedProposalId
    });
  });

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
  let selectedBillVotes: ParliamentarianVoteView[] = $derived(
    chatStore.selectedProposal
      ? chatStore.selectedParliamentarian
        ? toParliamentarianVoteViews(chatStore.voteHistory, chatStore.selectedParliamentarian)
        : toProposalVoteViews(chatStore.voteHistory)
      : []
  );
  let billsFeedback = $derived(
    getParliamentarianBillsFeedback(chatStore.selectedParliamentarian)
  );
  let votesFeedback = $derived(
    getParliamentarianVotesFeedback(
      chatStore.selectedParliamentarian,
      selectedParliamentarianVotes.length > 0
    )
  );
  let proposalVotesFeedback = $derived(
    getProposalVotesFeedback(chatStore.selectedProposal)
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

  function navigateBackToSearchOrWelcome(
    additionalUpdates: Parameters<typeof navigateTo>[1] extends { updates?: infer U }
      ? U
      : Record<string, unknown> = {}
  ) {
    navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: '',
        ...additionalUpdates
      },
      recordHistory: false
    });
  }

  function handleBackToParliamentarian() {
    if (!selectedParliamentarian) {
      navigateBackToSearchOrWelcome();
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
      navigateBackToSearchOrWelcome();
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
      navigateBackToSearchOrWelcome();
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
    navigateBackToSearchOrWelcome({
      selectedParliamentarian: null,
      parliamentarianProposals: [],
      voteHistory: []
    });
  }

  function handleStartOver() {
    reset();
    searchRenderKey += 1;
    searchFormResetToken += 1;
  }

  onDestroy(() => {
    cleanupPopstateListener?.();
    cleanupPopstateListener = null;
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
    <ConversationFlow
      {searchState}
      {submittedSearch}
      errorMessage={chatStore.errorMessage}
      {recoverableNotice}
      {searchResults}
      {selectedParliamentarian}
      {selectedBill}
      {selectedVote}
      {selectedParliamentarianBills}
      {selectedParliamentarianVotes}
      {selectedBillVotes}
      {billsFeedback}
      {votesFeedback}
      {proposalVotesFeedback}
      onSelectParliamentarian={handleSelectParliamentarian}
      onSelectBill={handleSelectBill}
      onSelectVote={handleSelectVote}
      onOpenParliamentarianBills={handleOpenParliamentarianBills}
      onOpenParliamentarianVotes={handleOpenParliamentarianVotes}
      onBackFromAbout={handleBackFromAbout}
      onBackToResults={handleBackToResults}
      onBackToParliamentarian={handleBackToParliamentarian}
      onBackToBills={handleBackToBills}
      onBackToVotes={handleBackToVotes}
      onStartOver={handleStartOver}
    />
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

  @media (max-width: 700px) {
    .app {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      padding: 7px;
      gap: 7px;
    }
  }
</style>
