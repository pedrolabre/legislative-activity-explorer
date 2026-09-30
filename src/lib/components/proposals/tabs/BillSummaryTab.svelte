<script lang="ts">
  let {
    officialSummary,
    factualSummary
  }: {
    officialSummary: string;
    factualSummary?: string;
  } = $props();

  const unavailableReviewedFactualSummaryMessage =
    'Resumo factual revisado ainda não foi adicionado para esta proposição.';
</script>

<div class="detail-sheet">
  <div class="sheet-section">
    <h4>Ementa oficial</h4>
    <p>{officialSummary}</p>
  </div>

  {#if factualSummary}
    <div class="sheet-section section-divider">
      <h4 id="factual-summary-title">Resumo factual revisado</h4>
      <p>{factualSummary}</p>
    </div>
  {:else}
    <div class="sheet-notice" role="status">
      <p class="text-muted">
        {unavailableReviewedFactualSummaryMessage}
      </p>
    </div>
  {/if}
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

  .sheet-section p {
    margin: 0;
    font-size: 11px;
    line-height: 1.55;
    color: var(--muted);
  }

  .section-divider {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
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
</style>
