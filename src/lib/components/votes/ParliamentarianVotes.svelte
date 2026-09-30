<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import { formatVotedAt } from '$lib/ui/dateFormatters';
  import { unavailableOfficialFieldLabel as unavailableLabel } from '$lib/ui/officialMessages';

  let {
    parliamentarianName,
    votes,
    coverageDescription = 'Registros disponíveis pela fonte oficial consultada.',
    emptyTitle = 'Nenhuma votação foi carregada para este parlamentar nesta consulta.',
    emptyDescription = 'A fonte consultada não retornou votações para esta seleção nesta sessão.',
    onSelectVote,
    onBackToParliamentarian,
    onStartOver
  }: {
    parliamentarianName: string;
    votes: ParliamentarianVoteView[];
    coverageDescription?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    onSelectVote: (id: string) => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  let voteCountLabel = $derived(
    votes.length === 1 ? '1 votação disponível' : `${votes.length} votações disponíveis`
  );
</script>

<div class="votes-view">
  <header class="list-head">
    <div>
      <p class="header-pre">Votações disponíveis</p>
      <h3 class="header-title">{parliamentarianName}</h3>
      <p class="header-sub">{voteCountLabel} nesta sessão.</p>
    </div>
    {#if votes.length > 0}
      <div class="count-badge" aria-live="polite">
        <span>{voteCountLabel}</span>
      </div>
    {/if}
  </header>

  {#if coverageDescription}
    <div class="notice" role="status">
      {coverageDescription}
    </div>
  {/if}

  {#if votes.length === 0}
    <div class="empty" role="status">
      <div>
        <b class="empty-icon">0</b>
        <h4 class="empty-title">{emptyTitle}</h4>
        <p class="empty-desc">{emptyDescription}</p>
        <button
          type="button"
          class="btn secondary empty-btn"
          onclick={onBackToParliamentarian}
        >
          ← Voltar ao perfil
        </button>
      </div>
    </div>
  {:else}
    <div class="vote-list">
      {#each votes as vote (vote.id)}
        <article class="vote-row">
          <div class="vote-info">
            <h4>{vote.billIdentification}</h4>
            <p>{vote.description}</p>
            <div class="vote-meta">
              <span>{vote.chamber}</span>
              {#if vote.votedAt}
                <span> · {formatVotedAt(vote.votedAt)}</span>
              {/if}
              {#if vote.officialResult}
                <span> · {vote.officialResult}</span>
              {/if}
            </div>
          </div>
          <div class="vote-badge-container">
            {#if vote.parliamentarianVote}
              <span class="sr-only">Voto registrado</span>
              <VoteBadge vote={vote.parliamentarianVote} />
            {:else}
              <span class="vote-notice" role="status">
                {vote.parliamentarianVoteNotice ?? unavailableLabel}
              </span>
            {/if}
          </div>
          <button
            type="button"
            class="btn primary vote-btn"
            aria-label={`Ver votação de ${vote.billIdentification}`}
            onclick={() => onSelectVote(vote.id)}
          >
            Ver votação
          </button>
        </article>
      {/each}
    </div>
  {/if}

  <div class="detail-actions">
    <button
      type="button"
      class="btn secondary"
      onclick={onBackToParliamentarian}
    >
      ← Voltar ao perfil
    </button>
    <button
      type="button"
      class="btn primary"
      onclick={onStartOver}
    >
      Nova consulta
    </button>
  </div>
</div>

<style>
  .votes-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .list-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 10px;
    margin-bottom: 8px;
    flex-shrink: 0;
  }

  .header-pre {
    margin: 0;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--accent);
  }

  .header-title {
    margin: 4px 0 0;
    font-size: 20px;
    font-weight: 650;
    line-height: 1.2;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .header-sub {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.4;
  }

  .count-badge {
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 3px 8px;
    font-size: 9px;
    font-weight: 700;
    color: var(--muted);
    background: var(--surface);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .notice {
    margin-bottom: 9px;
    border-left: 3px solid var(--accent);
    padding: 6px 0 6px 10px;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
    background: rgba(0, 95, 115, 0.04);
    border-radius: 0 4px 4px 0;
  }

  .vote-list {
    display: grid;
    gap: 7px;
    margin-top: 4px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--accent) rgba(204, 216, 211, 0.55);
    padding-right: 2px;
  }

  .vote-list::-webkit-scrollbar {
    width: 6px;
  }

  .vote-list::-webkit-scrollbar-track {
    background: rgba(204, 216, 211, 0.35);
    border-radius: 99px;
  }

  .vote-list::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 99px;
  }

  .vote-row {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #ffffff;
    padding: 9px 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 110px auto;
    gap: 10px;
    align-items: center;
    box-shadow: 0 1px 3px rgba(23, 32, 39, 0.04);
  }

  .vote-info {
    min-width: 0;
  }

  .vote-row h4 {
    margin: 0;
    font-size: 11px;
    font-weight: 750;
    line-height: 1.3;
    color: var(--ink);
  }

  .vote-row p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .vote-meta {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.35;
  }

  .vote-badge-container {
    display: flex;
    align-items: center;
  }

  .vote-notice {
    margin: 0;
    font-size: 9px;
    line-height: 1.3;
    color: var(--muted);
  }

  .vote-btn {
    min-height: 27px;
    padding: 0 8px;
    font-size: 9px;
    white-space: nowrap;
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

  .empty-btn {
    margin-top: 12px;
    min-height: 30px;
    font-size: 10px;
  }

  .detail-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(204, 216, 211, 0.55);
    flex-shrink: 0;
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

  @media (max-width: 700px) {
    .vote-row {
      grid-template-columns: 1fr auto;
      gap: 8px;
    }

    .vote-badge-container {
      display: none;
    }
  }
</style>
