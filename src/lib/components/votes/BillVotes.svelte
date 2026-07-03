<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import { formatVotedAt } from '$lib/ui/dateFormatters';
  import { unavailableOfficialFieldLabel as unavailableLabel } from '$lib/ui/officialMessages';

  let {
    vote,
    parliamentarianName,
    onBackToVotes,
    onBackToParliamentarian,
    onStartOver
  }: {
    vote: ParliamentarianVoteView;
    parliamentarianName: string;
    onBackToVotes: () => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  let countItems = $derived(
    vote.counts
      ? [
          { label: 'SIM' as const, value: vote.counts.yes },
          { label: 'NÃO' as const, value: vote.counts.no },
          { label: 'ABSTENÇÃO' as const, value: vote.counts.abstention },
          { label: 'AUSENTE' as const, value: vote.counts.absent }
        ]
      : []
  );

  let totalCount = $derived(
    vote.counts
      ? vote.counts.yes + vote.counts.no + vote.counts.abstention + vote.counts.absent
      : null
  );
</script>

<div class="space-y-6">
  <header>
    <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
      Detalhe da votação
    </p>
    <h3 class="mt-2 break-words text-2xl font-semibold leading-8 text-ink">
      {vote.billIdentification}
    </h3>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      Registro associado a <span class="font-medium text-ink">{parliamentarianName}</span>.
    </p>
  </header>

  <section class="border-t border-border pt-5" aria-labelledby="vote-facts-title">
    <h4 id="vote-facts-title" class="text-sm font-bold leading-6 text-ink">Dados factuais</h4>
    <dl class="mt-3 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
      <div>
        <dt class="font-bold text-ink">Proposição</dt>
        <dd>{vote.billIdentification}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Casa legislativa</dt>
        <dd>{vote.chamber}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Data</dt>
        <dd class:text-ink-muted={!vote.votedAt}>{formatVotedAt(vote.votedAt)}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Resultado oficial</dt>
        <dd class:text-ink-muted={!vote.officialResult}>
          {vote.officialResult ?? unavailableLabel}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="font-bold text-ink">Voto registrado</dt>
        <dd class="mt-2">
          {#if vote.parliamentarianVote}
            <VoteBadge vote={vote.parliamentarianVote} />
          {:else}
            <p class="text-sm leading-6 text-ink-muted" role="status">
              {vote.parliamentarianVoteNotice}
            </p>
          {/if}
        </dd>
      </div>
    </dl>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="vote-description-title">
    <h4 id="vote-description-title" class="text-sm font-bold leading-6 text-ink">
      Descrição factual
    </h4>
    <p class="mt-3 text-sm leading-6 text-ink-muted">{vote.description}</p>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="vote-counts-title">
    <h4 id="vote-counts-title" class="text-sm font-bold leading-6 text-ink">
      Contagens agregadas
    </h4>
    {#if vote.counts}
      <dl class="mt-3 grid gap-3 sm:grid-cols-2">
        {#each countItems as item (item.label)}
          <div class="rounded-ui border border-border bg-surface-raised p-4">
            <dt>
              <VoteBadge vote={item.label} />
            </dt>
            <dd class="mt-3 text-2xl font-semibold leading-8 text-ink">{item.value}</dd>
          </div>
        {/each}
      </dl>
      <p class="mt-3 text-sm leading-6 text-ink-muted">Total informado: {totalCount}</p>
    {:else}
      <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm leading-6 text-ink-muted">
          Contagens agregadas não informadas pela fonte oficial consultada.
        </p>
      </div>
    {/if}
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="nominal-votes-title">
    <h4 id="nominal-votes-title" class="text-sm font-bold leading-6 text-ink">Lista nominal</h4>
    {#if vote.individualVotes.length > 0}
      <ul class="mt-3 grid gap-3">
        {#each vote.individualVotes as individualVote (individualVote.parliamentarianName)}
          <li>
            <article
              class={`grid gap-3 rounded-ui border bg-surface-raised p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
                individualVote.isSelectedParliamentarian ? 'border-accent' : 'border-border'
              }`}
            >
              <div class="min-w-0">
                {#if individualVote.isSelectedParliamentarian}
                  <p class="mb-1 text-xs font-bold uppercase leading-5 tracking-normal text-accent">
                    Parlamentar selecionado
                  </p>
                {/if}
                <p class="break-words text-sm font-semibold leading-6 text-ink">
                  {individualVote.parliamentarianName}
                </p>
                <p class="mt-1 text-sm leading-6 text-ink-muted">
                  {individualVote.party} - {individualVote.state}
                </p>
              </div>
              <div>
                <p class="sr-only">Voto registrado</p>
                <VoteBadge vote={individualVote.vote} />
              </div>
            </article>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm leading-6 text-ink-muted">
          Lista nominal não informada pela fonte oficial consultada.
        </p>
      </div>
    {/if}
  </section>

  <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
    <button
      type="button"
      class="min-h-12 rounded-ui border border-border bg-surface-raised px-4 py-3 text-sm font-bold text-ink transition hover:border-accent"
      onclick={onBackToVotes}
    >
      Voltar às votações
    </button>
    <button
      type="button"
      class="min-h-12 rounded-ui border border-border bg-surface-raised px-4 py-3 text-sm font-bold text-ink transition hover:border-accent"
      onclick={onBackToParliamentarian}
    >
      Voltar ao perfil
    </button>
    <button
      type="button"
      class="min-h-12 rounded-ui bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-strong"
      onclick={onStartOver}
    >
      Nova consulta
    </button>
  </div>
</div>
