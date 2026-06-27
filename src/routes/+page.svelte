<script lang="ts">
  import { onDestroy } from 'svelte';
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import ConversationLog from '$lib/components/conversation/ConversationLog.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import InitialSearchForm from '$lib/components/search/InitialSearchForm.svelte';
  import {
    emptyInitialSearchResults,
    findInitialSearchResults,
    type InitialSearchResults
  } from '$lib/data/initialSearchFixtures';

  type SearchUiState = 'WELCOME' | 'SEARCHING' | 'SEARCH_RESULTS';

  const searchDelayMs = 450;

  let searchSequence = 0;
  let submittedSearch = $state<{ id: number; query: string } | null>(null);
  let searchState = $state<SearchUiState>('WELCOME');
  let searchResults = $state<InitialSearchResults>(emptyInitialSearchResults);
  let searchDelayId: number | undefined;

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

    searchDelayId = window.setTimeout(() => {
      if (submittedSearch?.id !== nextSearch.id) {
        return;
      }

      searchResults = findInitialSearchResults(query);
      searchState = 'SEARCH_RESULTS';
      searchDelayId = undefined;
    }, searchDelayMs);
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
        <InitialSearchForm onSearch={handleSearch} />
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
              <SearchResults query={submittedSearch.query} results={searchResults} />
            </ConversationBubble>
          {/if}
        {/key}
      {/if}
    </ConversationLog>
  </section>
</main>
