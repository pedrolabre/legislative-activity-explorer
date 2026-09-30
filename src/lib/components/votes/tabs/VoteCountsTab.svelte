<script lang="ts">
  import type { VoteCounts } from '$lib/domain';

  let { counts }: { counts?: VoteCounts } = $props();

  let totalCount = $derived(
    counts
      ? counts.yes + counts.no + counts.abstention + counts.absent
      : null
  );
</script>

{#if counts}
  <div class="vote-counts">
    <div class="vote-count">
      <small>SIM</small>
      <strong>{counts.yes}</strong>
    </div>
    <div class="vote-count">
      <small>NÃO</small>
      <strong>{counts.no}</strong>
    </div>
    <div class="vote-count">
      <small>ABSTENÇÃO</small>
      <strong>{counts.abstention}</strong>
    </div>
    <div class="vote-count">
      <small>AUSENTE</small>
      <strong>{counts.absent}</strong>
    </div>
  </div>
  <p class="counts-total">Total informado: {totalCount}</p>
{:else}
  <div class="sheet-notice" role="status">
    <p class="text-muted">
      Contagens agregadas não informadas pela fonte oficial consultada.
    </p>
  </div>
{/if}

<style>
  .vote-counts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
  }

  .vote-count {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #ffffff;
    padding: 12px 9px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(23, 32, 39, 0.04);
  }

  .vote-count small {
    display: block;
    color: var(--muted);
    font-size: 8px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .vote-count strong {
    display: block;
    margin-top: 4px;
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
  }

  .counts-total {
    font-size: 10px;
    color: var(--muted);
    margin: 10px 0 0;
    line-height: 1.4;
  }

  .sheet-notice {
    padding: 12px 14px;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(23, 32, 39, 0.04);
  }

  .text-muted {
    margin: 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }

  @media (max-width: 700px) {
    .vote-counts {
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
  }
</style>
