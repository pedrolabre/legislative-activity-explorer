<script lang="ts">
  import { NOMINAL_PAGE_SIZE_OPTIONS } from '$lib/components/votes/votePresentation';

  let {
    startItemIndex = 0,
    endItemIndex = 0,
    totalItems = 0,
    originalTotal = 0,
    pageSize = 25,
    hasFilteredResults = true,
    onPageSizeChange
  }: {
    startItemIndex: number;
    endItemIndex: number;
    totalItems: number;
    originalTotal: number;
    pageSize: number;
    hasFilteredResults: boolean;
    onPageSizeChange: (newPageSize: number) => void;
  } = $props();

  function handlePageSizeSelect(e: Event) {
    const select = e.target as HTMLSelectElement;
    onPageSizeChange(Number(select.value) || 25);
  }
</script>

<div class="nominal-summary-bar">
  <p class="summary-text" aria-live="polite">
    {#if hasFilteredResults}
      Exibindo {startItemIndex}–{endItemIndex} de {totalItems} parlamentares
      {#if totalItems < originalTotal}
        <span class="filter-indicator"> (filtrado de {originalTotal})</span>
      {/if}
    {:else}
      Nenhum parlamentar encontrado
    {/if}
  </p>

  <div class="page-size-control">
    <label for="nominal-page-size-select" class="page-size-label">
      Por página:
    </label>
    <select
      id="nominal-page-size-select"
      value={pageSize}
      onchange={handlePageSizeSelect}
      class="page-size-select"
    >
      {#each NOMINAL_PAGE_SIZE_OPTIONS as size (size)}
        <option value={size}>{size}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .nominal-summary-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }

  .summary-text {
    margin: 0;
    font-size: 12px;
    color: var(--ink);
    font-weight: 600;
  }

  .filter-indicator {
    color: var(--muted);
    font-weight: 400;
  }

  .page-size-control {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .page-size-label {
    font-size: 11px;
    color: var(--muted);
  }

  .page-size-select {
    padding: 3px 6px;
    font-size: 11px;
    color: var(--ink);
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
