<script lang="ts">
  import SearchResultCard from '$lib/components/search/SearchResultCard.svelte';

  interface SearchResultsView {
    parliamentarians: {
      kind: 'parliamentarian';
      id: string;
      name: string;
      office: string;
      party: string;
      state: string;
      status: string;
      chamber?: string;
      term?: string;
    }[];
    proposals: {
      kind: 'proposal';
      id: string;
      title: string;
      chamber: string;
      type?: string;
      subjectLabel?: string;
      subject?: string;
      status: string;
    }[];
  }

  let {
    query,
    results,
    onSelectParliamentarian,
    onSelectProposal
  }: {
    query: string;
    results: SearchResultsView;
    onSelectParliamentarian?: (id: string) => void;
    onSelectProposal?: (id: string) => void;
  } = $props();

  let totalResults = $derived(results.parliamentarians.length + results.proposals.length);
  let resultCountLabel = $derived(
    totalResults === 1 ? '1 registro encontrado' : `${totalResults} registros encontrados`
  );
</script>

<div class="search-results-flow">
  <header class="results-head">
    <p class="results-lead">Resultado da busca</p>
    {#if totalResults > 0}
      <p class="results-sub">
        {resultCountLabel} para <span class="query-term">{query}</span>.
      </p>
      <p class="results-official">
        Registros exibidos conforme retorno das fontes oficiais consultadas.
      </p>
    {:else}
      <p class="results-sub">
        Nenhum registro encontrado para <span class="query-term">{query}</span>.
      </p>
    {/if}
  </header>

  {#if totalResults === 0}
    <div class="empty" role="status">
      <div>
        <b aria-hidden="true">0</b>
        <h3>Não houve correspondência nesta busca.</h3>
        <p>Confira a grafia ou tente outro nome, sigla ou número de proposição.</p>
      </div>
    </div>
  {:else}
    <p class="results-ordering">
      Ordem alfabética por nome ou identificação.
    </p>

    {#if results.parliamentarians.length > 0}
      <section aria-labelledby="parliamentarian-results-title" class="results-section">
        <h3 id="parliamentarian-results-title" class="section-title">
          Parlamentares
        </h3>
        <div class="results">
          {#each results.parliamentarians as result (result.id)}
            <SearchResultCard {result} {onSelectParliamentarian} />
          {/each}
        </div>
      </section>
    {/if}

    {#if results.proposals.length > 0}
      <section aria-labelledby="proposal-results-title" class="results-section">
        <h3 id="proposal-results-title" class="section-title">
          Proposições
        </h3>
        <div class="results">
          {#each results.proposals as result (result.id)}
            <SearchResultCard {result} {onSelectProposal} />
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .search-results-flow {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .results-head {
    display: flex;
    flex-direction: column;
  }

  .results-lead {
    font-size: 13px;
    font-weight: 750;
    color: var(--ink);
    margin: 0;
  }

  .results-sub {
    margin: 3px 0 0;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .query-term {
    font-weight: 600;
    color: var(--ink);
  }

  .results-official {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.45;
  }

  .results-ordering {
    margin: 0;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--muted);
    letter-spacing: 0.03em;
  }

  .results-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    margin: 0;
    font-size: 12px;
    font-weight: 750;
    color: var(--ink);
  }

  .results {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-content: start;
  }

  .empty {
    height: 100%;
    min-height: 140px;
    display: grid;
    place-items: center;
    text-align: center;
    padding: 24px 12px;
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
    font-size: 14px;
    font-weight: 800;
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
    font-size: 11px;
    line-height: 1.45;
  }

  @media (max-width: 700px) {
    .results {
      grid-template-columns: 1fr;
    }
  }
</style>
