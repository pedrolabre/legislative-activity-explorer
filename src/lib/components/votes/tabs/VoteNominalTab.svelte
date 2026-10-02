<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';
  import type { ParliamentarianVoteIndividualView } from '$lib/domain';
  import {
    DEFAULT_NOMINAL_PAGE_SIZE,
    type NominalVoteFilter,
    countVotesByPosition,
    filterIndividualVotes,
    paginateIndividualVotes,
    prioritizeSelectedParliamentarian
  } from '$lib/components/votes/votePresentation';
  import VoteNominalControls from './VoteNominalControls.svelte';
  import VoteNominalSummaryBar from './VoteNominalSummaryBar.svelte';
  import VoteNominalPaginationNav from './VoteNominalPaginationNav.svelte';

  let {
    individualVotes = [],
    chamber = 'Câmara dos Deputados'
  }: {
    individualVotes?: ParliamentarianVoteIndividualView[];
    chamber?: string;
  } = $props();

  let searchQuery = $state('');
  let selectedVoteFilter = $state<NominalVoteFilter>('TODOS');
  let currentPage = $state(1);
  let pageSize = $state<number>(DEFAULT_NOMINAL_PAGE_SIZE);

  let isSenado = $derived(chamber === 'Senado Federal');
  let emptyTitle = $derived(
    isSenado
      ? 'A fonte oficial do Senado não retornou lista nominal para esta votação.'
      : 'A fonte oficial da Câmara não retornou lista nominal para esta votação.'
  );

  let voteCounts = $derived(countVotesByPosition(individualVotes));
  let selectedParliamentarian = $derived(
    individualVotes.find((vote) => vote.isSelectedParliamentarian)
  );

  let prioritizedVotes = $derived(prioritizeSelectedParliamentarian(individualVotes));

  let filteredVotes = $derived(
    filterIndividualVotes(prioritizedVotes, {
      query: searchQuery,
      votePosition: selectedVoteFilter
    })
  );

  let paginated = $derived(
    paginateIndividualVotes(filteredVotes, currentPage, pageSize)
  );

  let isSelectedInCurrentView = $derived(
    Boolean(
      selectedParliamentarian &&
        paginated.items.some((item) => item.isSelectedParliamentarian)
    )
  );

  function clearFilters() {
    searchQuery = '';
    selectedVoteFilter = 'TODOS';
    currentPage = 1;
  }

  function handleSearchChange(query: string) {
    searchQuery = query;
    currentPage = 1;
  }

  function handleVoteFilterChange(filter: NominalVoteFilter) {
    selectedVoteFilter = filter;
    currentPage = 1;
  }

  function handlePageSizeChange(newPageSize: number) {
    pageSize = newPageSize;
    currentPage = 1;
  }

  function handlePageChange(targetPage: number) {
    currentPage = Math.min(Math.max(1, targetPage), paginated.totalPages);
  }
</script>

{#if individualVotes.length > 0}
  <div class="nominal-container">
    <VoteNominalControls
      {searchQuery}
      {selectedVoteFilter}
      totalVotes={individualVotes.length}
      {voteCounts}
      onSearchChange={handleSearchChange}
      onVoteFilterChange={handleVoteFilterChange}
    />

    <VoteNominalSummaryBar
      startItemIndex={paginated.startItemIndex}
      endItemIndex={paginated.endItemIndex}
      totalItems={paginated.totalItems}
      originalTotal={individualVotes.length}
      {pageSize}
      hasFilteredResults={filteredVotes.length > 0}
      onPageSizeChange={handlePageSizeChange}
    />

    {#if selectedParliamentarian && !isSelectedInCurrentView}
      <section
        class="pinned-section"
        role="note"
        aria-label="Parlamentar em consulta fora do lote visível"
      >
        <div class="pinned-header">
          <span class="pinned-title">Parlamentar em consulta</span>
          <span class="pinned-desc">
            {selectedVoteFilter !== 'TODOS' || searchQuery.trim()
              ? 'Oculto pelos filtros aplicados ou fora da página atual'
              : 'Listado na página 1'}
          </span>
        </div>
        <article class="nominal selected">
          <div class="nominal-info">
            <span class="type">Parlamentar selecionado</span>
            <strong>{selectedParliamentarian.parliamentarianName}</strong>
            <span class="meta-text">{selectedParliamentarian.party} - {selectedParliamentarian.state}</span>
          </div>
          <div class="nominal-badge">
            <span class="sr-only">Voto registrado</span>
            <VoteBadge vote={selectedParliamentarian.vote} />
          </div>
        </article>
      </section>
    {/if}

    {#if filteredVotes.length > 0}
      <div class="nominal-list" role="feed" aria-label="Votação nominal dos parlamentares">
        {#each paginated.items as individualVote (individualVote.parliamentarianName)}
          <article class={`nominal ${individualVote.isSelectedParliamentarian ? 'selected' : ''}`}>
            <div class="nominal-info">
              {#if individualVote.isSelectedParliamentarian}
                <span class="type">Parlamentar selecionado</span>
              {/if}
              <strong>{individualVote.parliamentarianName}</strong>
              <span class="meta-text">{individualVote.party} - {individualVote.state}</span>
            </div>
            <div class="nominal-badge">
              <span class="sr-only">Voto registrado</span>
              <VoteBadge vote={individualVote.vote} />
            </div>
          </article>
        {/each}
      </div>

      {#if paginated.totalPages > 1}
        <VoteNominalPaginationNav
          currentPage={paginated.currentPage}
          totalPages={paginated.totalPages}
          onPageChange={handlePageChange}
        />
      {/if}
    {:else}
      <div class="empty-filter" role="status">
        <p class="empty-filter-title">Nenhum parlamentar encontrado</p>
        <p class="empty-filter-desc">
          Nenhum registro corresponde aos critérios de busca ou filtros selecionados.
        </p>
        <button type="button" class="btn-clear-filters" onclick={clearFilters}>
          Limpar filtros e busca
        </button>
      </div>
    {/if}
  </div>
{:else}
  <div class="empty" role="status">
    <div>
      <b class="empty-icon">0</b>
      <h4 class="empty-title">{emptyTitle}</h4>
      <p class="empty-desc">
        Em votações simbólicas ou secretas, votos individuais podem não ser contabilizados.
      </p>
    </div>
  </div>
{/if}

<style>
  .nominal-container {
    display: grid;
    gap: 12px;
  }

  .pinned-section {
    background: #f4f8fa;
    border: 1px dashed var(--accent);
    border-radius: 8px;
    padding: 8px;
    display: grid;
    gap: 6px;
  }

  .pinned-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .pinned-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--accent);
  }

  .pinned-desc {
    font-size: 10px;
    color: var(--muted);
  }

  .nominal-list {
    display: grid;
    gap: 6px;
  }

  .nominal {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #ffffff;
    padding: 8px 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    box-shadow: 0 1px 2px rgba(23, 32, 39, 0.03);
    transition: border-color 0.14s ease, box-shadow 0.14s ease;
  }

  .nominal.selected {
    border-color: var(--accent);
    box-shadow: inset 3px 0 0 var(--accent), 0 1px 3px rgba(0, 95, 115, 0.08);
  }

  .nominal-info {
    min-width: 0;
  }

  .type {
    display: block;
    margin: 0 0 2px;
    color: var(--accent);
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .nominal strong {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .meta-text {
    display: block;
    margin-top: 2px;
    color: var(--muted);
    font-size: 9px;
  }

  .nominal-badge {
    flex-shrink: 0;
  }

  .empty-filter {
    padding: 24px 16px;
    text-align: center;
    background: #ffffff;
    border: 1px dashed var(--border);
    border-radius: 8px;
    display: grid;
    gap: 8px;
    place-items: center;
  }

  .empty-filter-title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
  }

  .empty-filter-desc {
    margin: 0;
    font-size: 11px;
    color: var(--muted);
  }

  .btn-clear-filters {
    padding: 6px 14px;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    background: #f0f7f9;
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.14s ease;
  }

  .btn-clear-filters:hover {
    background: var(--accent);
    color: #ffffff;
  }

  .empty {
    padding: 24px 16px;
    display: grid;
    place-items: center;
    text-align: center;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .empty div {
    max-width: 500px;
  }

  .empty-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin: 0 auto 9px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: #ffffff;
    color: var(--accent);
    font-size: 14px;
    font-weight: 800;
  }

  .empty-title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
  }

  .empty-desc {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
