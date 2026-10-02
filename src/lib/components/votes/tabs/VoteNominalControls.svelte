<script lang="ts">
  import type { DisplayVotePosition } from '$lib/domain';
  import type { NominalVoteFilter } from '$lib/components/votes/votePresentation';

  let {
    searchQuery = '',
    selectedVoteFilter = 'TODOS',
    totalVotes = 0,
    voteCounts = { SIM: 0, NÃO: 0, ABSTENÇÃO: 0, AUSENTE: 0 },
    onSearchChange,
    onVoteFilterChange
  }: {
    searchQuery: string;
    selectedVoteFilter: NominalVoteFilter;
    totalVotes: number;
    voteCounts: Record<DisplayVotePosition, number>;
    onSearchChange: (query: string) => void;
    onVoteFilterChange: (filter: NominalVoteFilter) => void;
  } = $props();

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    onSearchChange(value);
  }
</script>

<div class="nominal-controls">
  <div class="search-box">
    <label for="nominal-search-input" class="sr-only">
      Buscar parlamentar por nome, partido ou estado
    </label>
    <input
      id="nominal-search-input"
      type="search"
      value={searchQuery}
      oninput={handleSearchInput}
      placeholder="Buscar por nome, partido ou UF..."
      class="search-input"
    />
    {#if searchQuery}
      <button
        type="button"
        class="btn-clear"
        onclick={() => onSearchChange('')}
        aria-label="Limpar termo de busca"
      >
        ×
      </button>
    {/if}
  </div>

  <div class="filter-pills" role="group" aria-label="Filtrar por posição de voto">
    <button
      type="button"
      class={`filter-pill ${selectedVoteFilter === 'TODOS' ? 'active' : ''}`}
      aria-pressed={selectedVoteFilter === 'TODOS'}
      onclick={() => onVoteFilterChange('TODOS')}
    >
      Todos <span class="pill-count">({totalVotes})</span>
    </button>
    <button
      type="button"
      class={`filter-pill ${selectedVoteFilter === 'SIM' ? 'active' : ''}`}
      aria-pressed={selectedVoteFilter === 'SIM'}
      onclick={() => onVoteFilterChange('SIM')}
    >
      SIM <span class="pill-count">({voteCounts.SIM})</span>
    </button>
    <button
      type="button"
      class={`filter-pill ${selectedVoteFilter === 'NÃO' ? 'active' : ''}`}
      aria-pressed={selectedVoteFilter === 'NÃO'}
      onclick={() => onVoteFilterChange('NÃO')}
    >
      NÃO <span class="pill-count">({voteCounts.NÃO})</span>
    </button>
    <button
      type="button"
      class={`filter-pill ${selectedVoteFilter === 'ABSTENÇÃO' ? 'active' : ''}`}
      aria-pressed={selectedVoteFilter === 'ABSTENÇÃO'}
      onclick={() => onVoteFilterChange('ABSTENÇÃO')}
    >
      ABSTENÇÃO <span class="pill-count">({voteCounts.ABSTENÇÃO})</span>
    </button>
    <button
      type="button"
      class={`filter-pill ${selectedVoteFilter === 'AUSENTE' ? 'active' : ''}`}
      aria-pressed={selectedVoteFilter === 'AUSENTE'}
      onclick={() => onVoteFilterChange('AUSENTE')}
    >
      AUSENTE <span class="pill-count">({voteCounts.AUSENTE})</span>
    </button>
  </div>
</div>

<style>
  .nominal-controls {
    display: grid;
    gap: 8px;
  }

  .search-box {
    position: relative;
    width: 100%;
  }

  .search-input {
    width: 100%;
    padding: 8px 32px 8px 12px;
    font-size: 13px;
    color: var(--ink);
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 6px;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(0, 95, 115, 0.15);
  }

  .btn-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--muted);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }

  .btn-clear:hover {
    color: var(--ink);
  }

  .filter-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .filter-pill {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink);
    background: #f8fafc;
    border: 1px solid var(--border);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .filter-pill:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .filter-pill.active {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
  }

  .filter-pill.active .pill-count {
    color: rgba(255, 255, 255, 0.85);
  }

  .pill-count {
    font-size: 10px;
    color: var(--muted);
    font-weight: 500;
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
