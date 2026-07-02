<script lang="ts">
  type SearchResult =
    | {
        kind: 'parliamentarian';
        id: string;
        name: string;
        office: string;
        party: string;
        state: string;
        status: string;
      }
    | {
        kind: 'proposal';
        id: string;
        title: string;
        chamber: string;
        subjectLabel?: string;
        subject?: string;
        status: string;
      };

  let {
    result,
    onSelectParliamentarian
  }: { result: SearchResult; onSelectParliamentarian?: (id: string) => void } = $props();

  let resultLabel = $derived(result.kind === 'parliamentarian' ? 'Parlamentar' : 'Proposição');

  function handleSelectParliamentarian() {
    if (result.kind !== 'parliamentarian') {
      return;
    }

    onSelectParliamentarian?.(result.id);
  }
</script>

<article class="rounded-ui border border-border bg-surface-raised p-4 shadow-sm">
  <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">{resultLabel}</p>

  {#if result.kind === 'parliamentarian'}
    <h4 class="mt-2 break-words text-base font-semibold leading-6 text-ink">{result.name}</h4>
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
    {#if onSelectParliamentarian}
      <button
        type="button"
        class="mt-4 min-h-11 rounded-ui bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-strong"
        aria-label={`Ver perfil de ${result.name}`}
        onclick={handleSelectParliamentarian}
      >
        Ver perfil
      </button>
    {/if}
  {:else}
    <h4 class="mt-2 break-words text-base font-semibold leading-6 text-ink">{result.title}</h4>
    <dl class="mt-4 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
      <div>
        <dt class="font-bold text-ink">Casa</dt>
        <dd>{result.chamber}</dd>
      </div>
      {#if result.subject}
        <div>
          <dt class="font-bold text-ink">{result.subjectLabel ?? 'Tema'}</dt>
          <dd>{result.subject}</dd>
        </div>
      {/if}
      <div class="sm:col-span-2">
        <dt class="font-bold text-ink">Situação</dt>
        <dd>{result.status}</dd>
      </div>
    </dl>
  {/if}
</article>
