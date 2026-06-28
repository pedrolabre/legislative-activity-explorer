<script lang="ts">
  import { onDestroy } from 'svelte';
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import ConversationLog from '$lib/components/conversation/ConversationLog.svelte';
  import ParliamentarianDetail from '$lib/components/parliamentarians/ParliamentarianDetail.svelte';
  import BillDetail from '$lib/components/proposals/BillDetail.svelte';
  import ParliamentarianBills from '$lib/components/proposals/ParliamentarianBills.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import InitialSearchForm from '$lib/components/search/InitialSearchForm.svelte';
  import {
    emptyInitialSearchResults,
    findInitialSearchResults,
    type InitialSearchResults
  } from '$lib/data/initialSearchFixtures';
  import {
    getParliamentarianDetailById,
    type ParliamentarianDetail as ParliamentarianDetailData
  } from '$lib/data/parliamentarianDetailFixtures';
  import {
    getBillById,
    getBillsByParliamentarianId,
    type ParliamentarianBill
  } from '$lib/data/parliamentarianBillFixtures';

  type SearchUiState =
    | 'WELCOME'
    | 'SEARCHING'
    | 'SEARCH_RESULTS'
    | 'PARLIAMENTARIAN_DETAIL'
    | 'PARLIAMENTARIAN_BILLS'
    | 'BILL_DETAIL';

  const searchDelayMs = 450;

  let searchSequence = 0;
  let submittedSearch = $state<{ id: number; query: string } | null>(null);
  let searchState = $state<SearchUiState>('WELCOME');
  let searchResults = $state<InitialSearchResults>(emptyInitialSearchResults);
  let selectedParliamentarian = $state<ParliamentarianDetailData | null>(null);
  let selectedBill = $state<ParliamentarianBill | null>(null);
  let searchFormResetToken = $state(0);
  let searchDelayId: number | undefined;
  let selectedParliamentarianBills = $derived(
    selectedParliamentarian ? getBillsByParliamentarianId(selectedParliamentarian.id) : []
  );

  function handleSearch(query: string) {
    searchSequence += 1;
    const nextSearch = {
      id: searchSequence,
      query
    };

    if (searchDelayId) {
      window.clearTimeout(searchDelayId);
    }

    submittedSearch = nextSearch;
    searchState = 'SEARCHING';
    searchResults = emptyInitialSearchResults;
    selectedParliamentarian = null;
    selectedBill = null;

    searchDelayId = window.setTimeout(() => {
      if (submittedSearch?.id !== nextSearch.id) {
        return;
      }

      searchResults = findInitialSearchResults(query);
      searchState = 'SEARCH_RESULTS';
      selectedParliamentarian = null;
      selectedBill = null;
      searchDelayId = undefined;
    }, searchDelayMs);
  }

  function handleSelectParliamentarian(id: string) {
    const parliamentarian = getParliamentarianDetailById(id);

    if (!parliamentarian) {
      return;
    }

    selectedParliamentarian = parliamentarian;
    selectedBill = null;
    searchState = 'PARLIAMENTARIAN_DETAIL';
  }

  function handleOpenParliamentarianBills() {
    if (!selectedParliamentarian) {
      return;
    }

    selectedBill = null;
    searchState = 'PARLIAMENTARIAN_BILLS';
  }

  function handleSelectBill(id: string) {
    const bill = getBillById(id);

    if (!bill || bill.parliamentarianId !== selectedParliamentarian?.id) {
      return;
    }

    selectedBill = bill;
    searchState = 'BILL_DETAIL';
  }

  function handleBackToParliamentarian() {
    if (!selectedParliamentarian) {
      searchState = submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME';
      return;
    }

    selectedBill = null;
    searchState = 'PARLIAMENTARIAN_DETAIL';
  }

  function handleBackToBills() {
    if (!selectedParliamentarian) {
      searchState = submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME';
      return;
    }

    selectedBill = null;
    searchState = 'PARLIAMENTARIAN_BILLS';
  }

  function handleBackToResults() {
    selectedParliamentarian = null;
    selectedBill = null;

    if (!submittedSearch) {
      searchState = 'WELCOME';
      return;
    }

    searchState = 'SEARCH_RESULTS';
  }

  function handleStartOver() {
    if (searchDelayId) {
      window.clearTimeout(searchDelayId);
      searchDelayId = undefined;
    }

    searchSequence += 1;
    submittedSearch = null;
    searchState = 'WELCOME';
    searchResults = emptyInitialSearchResults;
    selectedParliamentarian = null;
    selectedBill = null;
    searchFormResetToken += 1;
  }

  onDestroy(() => {
    if (searchDelayId) {
      window.clearTimeout(searchDelayId);
    }
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
    </div>

    <ConversationLog title="Conversa de consulta">
      <ConversationBubble>
        <p>Informe um parlamentar ou uma proposição para iniciar a consulta.</p>
      </ConversationBubble>

      {#if submittedSearch}
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
          {/if}
        {/key}
      {/if}
    </ConversationLog>
  </section>
</main>
