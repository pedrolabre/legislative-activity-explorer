<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import { formatVotedAt } from '$lib/ui/dateFormatters';
  import { unavailableOfficialFieldLabel as unavailableLabel } from '$lib/ui/officialMessages';

  let {
    vote,
    parliamentarianName
  }: {
    vote: ParliamentarianVoteView;
    parliamentarianName?: string;
  } = $props();

  let formattedDate = $derived(formatVotedAt(vote.votedAt));
</script>

<div class="detail-sheet">
  <div class="sheet-header">
    <div>
      <span class="sheet-type">
        {vote.chamber} · Sessão em {formattedDate}
      </span>
      <h4 class="sheet-title">{vote.billIdentification}</h4>
    </div>
    <span class={`badge ${vote.officialResult === 'Aprovado' ? 'active' : ''}`}>
      {vote.officialResult ?? unavailableLabel}
    </span>
  </div>

  <dl class="sheet-grid">
    <div class="sheet-item">
      <dt>Casa legislativa</dt>
      <dd>{vote.chamber}</dd>
    </div>
    <div class="sheet-item">
      <dt>Resultado oficial</dt>
      <dd class:text-muted={!vote.officialResult}>
        {vote.officialResult ?? unavailableLabel}
      </dd>
    </div>
    {#if parliamentarianName}
      <div class="sheet-item sheet-full">
        <dt>Voto registrado ({parliamentarianName})</dt>
        <dd class="vote-registered-value">
          {#if vote.parliamentarianVote}
            <span class="sr-only">Voto registrado</span>
            <VoteBadge vote={vote.parliamentarianVote} />
          {:else}
            <span class="text-muted" role="status">
              {vote.parliamentarianVoteNotice ?? unavailableLabel}
            </span>
          {/if}
        </dd>
      </div>
    {/if}
    <div class="sheet-item sheet-full">
      <dt>Descrição factual</dt>
      <dd>{vote.description}</dd>
    </div>
  </dl>
</div>

<style>
  .detail-sheet {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(23, 32, 39, 0.04);
  }

  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-bottom: 10px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }

  .sheet-type {
    display: block;
    font-size: 8px;
    font-weight: 850;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .sheet-title {
    margin: 2px 0 0;
    font-size: 17px;
    font-weight: 750;
    line-height: 1.2;
    color: var(--ink);
  }

  .sheet-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 18px;
    margin: 0;
  }

  .sheet-item dt {
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
    color: var(--muted);
    letter-spacing: 0.4px;
  }

  .sheet-item dd {
    margin: 3px 0 0;
    font-size: 11px;
    line-height: 1.45;
    color: var(--ink);
    font-weight: 550;
    overflow-wrap: anywhere;
  }

  .sheet-full {
    grid-column: 1 / -1;
  }

  .vote-registered-value {
    display: flex;
    align-items: center;
    margin-top: 4px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: #ffffff;
    color: var(--accent2);
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .badge.active {
    background: #edf7f1;
    border-color: #a8dbba;
    color: #156d39;
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
    .sheet-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
</style>
