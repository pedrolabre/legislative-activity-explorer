<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';
  import type { ParliamentarianVoteIndividualView } from '$lib/domain';

  let {
    individualVotes = [],
    chamber = 'Câmara dos Deputados'
  }: {
    individualVotes?: ParliamentarianVoteIndividualView[];
    chamber?: string;
  } = $props();

  let isSenado = $derived(chamber === 'Senado Federal');
  let emptyTitle = $derived(
    isSenado
      ? 'A fonte oficial do Senado não retornou lista nominal para esta votação.'
      : 'A fonte oficial da Câmara não retornou lista nominal para esta votação.'
  );
</script>

{#if individualVotes.length > 0}
  <div class="nominal-list">
    {#each individualVotes as individualVote (individualVote.parliamentarianName)}
      <article class={`nominal ${individualVote.isSelectedParliamentarian ? 'selected' : ''}`}>
        <div class="nominal-info">
          {#if individualVote.isSelectedParliamentarian}
            <span class="type">Parlamentar selecionado</span>
          {/if}
          <strong>{individualVote.parliamentarianName}</strong>
          <span class="meta-text">{individualVote.party} - {individualVote.state}</span>
        </div>
        <div class="nominal-badge">
          <span class="sr-only">Voto registrado</span>
          <VoteBadge vote={individualVote.vote} />
        </div>
      </article>
    {/each}
  </div>
{:else}
  <div class="empty" role="status">
    <div>
      <b class="empty-icon">0</b>
      <h4 class="empty-title">{emptyTitle}</h4>
      <p class="empty-desc">
        Em votações simbólicas ou secretas, votos individuais podem não ser contabilizados.
      </p>
    </div>
  </div>
{/if}

<style>
  .nominal-list {
    display: grid;
    gap: 6px;
  }

  .nominal {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #ffffff;
    padding: 8px 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    box-shadow: 0 1px 2px rgba(23, 32, 39, 0.03);
    transition: border-color 0.14s ease, box-shadow 0.14s ease;
  }

  .nominal.selected {
    border-color: var(--accent);
    box-shadow: inset 3px 0 0 var(--accent), 0 1px 3px rgba(0, 95, 115, 0.08);
  }

  .nominal-info {
    min-width: 0;
  }

  .type {
    display: block;
    margin: 0 0 2px;
    color: var(--accent);
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .nominal strong {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .meta-text {
    display: block;
    margin-top: 2px;
    color: var(--muted);
    font-size: 9px;
  }

  .nominal-badge {
    flex-shrink: 0;
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
