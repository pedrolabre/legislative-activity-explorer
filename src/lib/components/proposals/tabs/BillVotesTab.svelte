<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import { formatVotedAt } from '$lib/ui/dateFormatters';
  import {
    officialCamaraProposalVotesEmptyMessage,
    unavailableOfficialFieldLabel as unavailableLabel
  } from '$lib/ui/officialMessages';

  let {
    associatedVotes = [],
    billIdentification,
    parliamentarianName,
    officialVotesTitle = 'Votações da Câmara',
    officialVotesEmptyMessage = officialCamaraProposalVotesEmptyMessage,
    onSelectVote = () => undefined
  }: {
    associatedVotes?: ParliamentarianVoteView[];
    billIdentification: string;
    parliamentarianName?: string;
    officialVotesTitle?: string;
    officialVotesEmptyMessage?: string;
    onSelectVote?: (id: string) => void;
  } = $props();
</script>

<div class="detail-sheet">
  <div class="sheet-section">
    <h4>{officialVotesTitle}</h4>

    {#if associatedVotes.length > 0}
      <p class="section-lead">Registros oficiais associados à proposição aberta.</p>
      <div class="vote-list">
        {#each associatedVotes as vote (vote.id)}
          <article class="vote-row">
            <div class="vote-info">
              <h5 class="vote-desc">{vote.description}</h5>
              <p class="vote-meta">
                <span class:text-muted={!vote.votedAt}>{formatVotedAt(vote.votedAt)}</span>
                ·
                <span class:text-muted={!vote.officialResult}>
                  {vote.officialResult ?? unavailableLabel}
                </span>
              </p>
            </div>

            {#if parliamentarianName}
              <div class="vote-position">
                {#if vote.parliamentarianVote}
                  <span class="sr-only">Voto registrado</span>
                  <VoteBadge vote={vote.parliamentarianVote} />
                {:else}
                  <p class="vote-notice" role="status">
                    {vote.parliamentarianVoteNotice}
                  </p>
                {/if}
              </div>
            {/if}

            <button
              type="button"
              class="btn primary vote-btn"
              aria-label={`Ver votação de ${billIdentification}`}
              onclick={() => onSelectVote(vote.id)}
            >
              Ver votação
            </button>
          </article>
        {/each}
      </div>
    {:else}
      <div class="sheet-notice" role="status">
        <p class="text-muted">
          {officialVotesEmptyMessage}
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .detail-sheet {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(23, 32, 39, 0.04);
  }

  .sheet-section h4 {
    margin: 0 0 6px;
    font-size: 10px;
    font-weight: 850;
    color: var(--accent2);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .section-lead {
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 8px !important;
  }

  .vote-list {
    display: grid;
    gap: 7px;
    margin-top: 6px;
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
  }

  .vote-info {
    min-width: 0;
  }

  .vote-desc {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.3;
    color: var(--ink);
  }

  .vote-meta {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.35;
  }

  .vote-position {
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

  .sheet-notice {
    margin-top: 10px;
    padding: 10px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .text-muted {
    color: var(--muted);
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

    .vote-position {
      display: none;
    }
  }
</style>
