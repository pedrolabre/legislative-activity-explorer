<script lang="ts">
  import type {
    InitialSearchParliamentarianResult,
    InitialSearchProposalResult
  } from '$lib/data/initialSearchFixtures';

  type SearchResult = InitialSearchParliamentarianResult | InitialSearchProposalResult;

  let { result }: { result: SearchResult } = $props();

  let resultLabel = $derived(result.kind === 'parliamentarian' ? 'Parlamentar' : 'Proposição');
</script>

<article class="rounded-ui border border-border bg-surface-raised p-4 shadow-sm">
  <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">{resultLabel}</p>

  {#if result.kind === 'parliamentarian'}
    <h4 class="mt-2 text-base font-semibold leading-6 text-ink">{result.name}</h4>
    <dl class="mt-4 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
      <div>
        <dt class="font-bold text-ink">Cargo</dt>
        <dd>{result.office}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">UF</dt>
        <dd>{result.state}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Partido</dt>
        <dd>{result.party}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Situação</dt>
        <dd>{result.status}</dd>
      </div>
    </dl>
  {:else}
    <h4 class="mt-2 text-base font-semibold leading-6 text-ink">{result.title}</h4>
    <dl class="mt-4 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
      <div>
        <dt class="font-bold text-ink">Casa</dt>
        <dd>{result.chamber}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Tema</dt>
        <dd>{result.subject}</dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="font-bold text-ink">Situação</dt>
        <dd>{result.status}</dd>
      </div>
    </dl>
  {/if}
</article>
