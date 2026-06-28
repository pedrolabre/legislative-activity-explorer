<script lang="ts">
  import SearchResultCard from '$lib/components/search/SearchResultCard.svelte';
  import type { InitialSearchResults } from '$lib/data/initialSearchFixtures';

  let {
    query,
    results,
    onSelectParliamentarian
  }: {
    query: string;
    results: InitialSearchResults;
    onSelectParliamentarian?: (id: string) => void;
  } = $props();

  let totalResults = $derived(results.parliamentarians.length + results.proposals.length);
  let resultCountLabel = $derived(
    totalResults === 1 ? '1 registro encontrado' : `${totalResults} registros encontrados`
  );
</script>

<div class="space-y-5">
  <div>
    <p class="text-sm font-bold leading-6 text-ink">Resultado da busca</p>
    {#if totalResults > 0}
      <p class="mt-1 break-words text-sm leading-6 text-ink-muted">
        {resultCountLabel} para <span class="font-medium text-ink">{query}</span>.
      </p>
      <p class="mt-2 text-sm leading-6 text-ink-muted">
        Dados de exemplo nesta página, sem consulta a bases oficiais.
      </p>
    {:else}
      <p class="mt-1 break-words text-sm leading-6 text-ink-muted">
        Nenhum registro encontrado para <span class="font-medium text-ink">{query}</span>.
      </p>
    {/if}
  </div>

  {#if totalResults === 0}
    <div class="rounded-ui border border-border bg-surface-raised p-4" role="status">
      <p class="text-sm font-semibold leading-6 text-ink">Não houve correspondência nesta busca.</p>
      <p class="mt-2 text-sm leading-6 text-ink-muted">
        Confira a grafia ou tente outro nome, sigla ou número de proposição.
      </p>
    </div>
  {:else}
    <p class="text-xs font-bold uppercase leading-5 tracking-normal text-ink-muted">
      Ordem alfabética por nome ou identificação.
    </p>

    {#if results.parliamentarians.length > 0}
      <section aria-labelledby="parliamentarian-results-title">
        <h3 id="parliamentarian-results-title" class="text-sm font-bold leading-6 text-ink">
          Parlamentares
        </h3>
        <ul class="mt-3 grid gap-3">
          {#each results.parliamentarians as result (result.id)}
            <li>
              <SearchResultCard {result} {onSelectParliamentarian} />
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if results.proposals.length > 0}
      <section aria-labelledby="proposal-results-title">
        <h3 id="proposal-results-title" class="text-sm font-bold leading-6 text-ink">
          Proposições
        </h3>
        <ul class="mt-3 grid gap-3">
          {#each results.proposals as result (result.id)}
            <li>
              <SearchResultCard {result} />
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</div>
