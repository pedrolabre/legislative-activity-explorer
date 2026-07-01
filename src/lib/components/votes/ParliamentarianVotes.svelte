<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';

  type DisplayVotePosition = 'SIM' | 'NÃO' | 'ABSTENÇÃO' | 'AUSENTE';

  interface ParliamentarianVoteView {
    id: string;
    parliamentarianId: string;
    billIdentification: string;
    chamber: string;
    description: string;
    parliamentarianVote?: DisplayVotePosition;
    parliamentarianVoteNotice?: string;
    votedAt?: string;
    officialResult?: string;
    counts?: {
      yes: number;
      no: number;
      abstention: number;
      absent: number;
    };
    individualVotes: {
      parliamentarianName: string;
      party: string;
      state: string;
      vote: DisplayVotePosition;
    }[];
  }

  let {
    parliamentarianName,
    votes,
    onSelectVote,
    onBackToParliamentarian,
    onStartOver
  }: {
    parliamentarianName: string;
    votes: ParliamentarianVoteView[];
    onSelectVote: (id: string) => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  const unavailableLabel = 'Não disponível nesta visualização.';

  let voteCountLabel = $derived(
    votes.length === 1 ? '1 votação associada' : `${votes.length} votações associadas`
  );

  function formatVotedAt(value?: string) {
    if (!value) {
      return unavailableLabel;
    }

    const [year, month, day] = value.split('-');

    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }
</script>

<div class="space-y-6">
  <header>
    <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
      Votações associadas
    </p>
    <h3 class="mt-2 break-words text-2xl font-semibold leading-8 text-ink">
      {parliamentarianName}
    </h3>
    <p class="mt-3 text-sm leading-6 text-ink-muted">{voteCountLabel} nesta página.</p>
    <p class="mt-2 text-sm leading-6 text-ink-muted">
      Dados apresentados nesta página conforme a fonte disponível.
    </p>
  </header>

  {#if votes.length === 0}
    <div class="rounded-ui border border-border bg-surface-raised p-4" role="status">
      <p class="text-sm font-semibold leading-6 text-ink">
        Não há votações associadas nesta visualização.
      </p>
      <p class="mt-2 text-sm leading-6 text-ink-muted">
        Você pode voltar ao perfil do parlamentar ou iniciar uma nova consulta.
      </p>
    </div>
  {:else}
    <section aria-labelledby="parliamentarian-votes-title">
      <h4 id="parliamentarian-votes-title" class="text-sm font-bold leading-6 text-ink">
        Lista de votações
      </h4>
      <p class="mt-1 text-xs font-bold uppercase leading-5 tracking-normal text-ink-muted">
        Ordem por data, quando disponível.
      </p>

      <ul class="mt-3 grid gap-3">
        {#each votes as vote (vote.id)}
          <li>
            <article class="rounded-ui border border-border bg-surface-raised p-4 shadow-sm">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
                    Votação
                  </p>
                  <h5 class="mt-2 break-words text-base font-semibold leading-6 text-ink">
                    {vote.billIdentification}
                  </h5>
                </div>
                <div class="shrink-0">
                  {#if vote.parliamentarianVote}
                    <p class="sr-only">Voto registrado</p>
                    <VoteBadge vote={vote.parliamentarianVote} />
                  {:else}
                    <p class="max-w-52 text-sm leading-6 text-ink-muted" role="status">
                      {vote.parliamentarianVoteNotice}
                    </p>
                  {/if}
                </div>
              </div>

              <dl class="mt-4 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
                <div>
                  <dt class="font-bold text-ink">Casa legislativa</dt>
                  <dd>{vote.chamber}</dd>
                </div>
                <div>
                  <dt class="font-bold text-ink">Data</dt>
                  <dd class:text-ink-muted={!vote.votedAt}>{formatVotedAt(vote.votedAt)}</dd>
                </div>
                <div class="sm:col-span-2">
                  <dt class="font-bold text-ink">Resultado oficial</dt>
                  <dd class:text-ink-muted={!vote.officialResult}>
                    {vote.officialResult ?? unavailableLabel}
                  </dd>
                </div>
              </dl>

              <p class="mt-4 text-sm leading-6 text-ink-muted">{vote.description}</p>

              <button
                type="button"
                class="mt-4 min-h-11 rounded-ui bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-strong"
                aria-label={`Ver votação de ${vote.billIdentification}`}
                onclick={() => onSelectVote(vote.id)}
              >
                Ver votação
              </button>
            </article>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
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
