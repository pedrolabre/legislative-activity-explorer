<script lang="ts">
  import { formatPresentedAt } from '$lib/ui/dateFormatters';
  import { unavailableOfficialFieldLabel as unavailableLabel } from '$lib/ui/officialMessages';

  interface BillFactsView {
    identification: string;
    chamber: string;
    type?: string;
    number?: string;
    year?: number;
    subjectLabel?: string;
    subject?: string;
    status: string;
    currentStageLabel?: string;
    currentStage?: string;
    relationship?: string;
    authorship?: string;
    presentedAt?: string;
    officialFullTextUrl?: string;
  }

  let { bill }: { bill: BillFactsView } = $props();
</script>

<div class="detail-sheet">
  <div class="sheet-header">
    <div>
      <span class="sheet-type">
        {bill.chamber} · Apresentação em {formatPresentedAt(bill.presentedAt)}
      </span>
      <h4 class="sheet-title">{bill.identification}</h4>
    </div>
    <span class={`badge ${bill.status === 'Em tramitação' ? 'active' : ''}`}>
      {bill.status}
    </span>
  </div>

  <dl class="sheet-grid">
    <div class="sheet-item">
      <dt>Identificação</dt>
      <dd>{bill.identification}</dd>
    </div>
    <div class="sheet-item">
      <dt>Casa legislativa</dt>
      <dd>{bill.chamber}</dd>
    </div>
    <div class="sheet-item">
      <dt>Tipo</dt>
      <dd>{bill.type}</dd>
    </div>
    <div class="sheet-item">
      <dt>Número</dt>
      <dd class:text-muted={!bill.number}>{bill.number ?? unavailableLabel}</dd>
    </div>
    <div class="sheet-item">
      <dt>Ano</dt>
      <dd class:text-muted={!bill.year}>{bill.year ?? unavailableLabel}</dd>
    </div>
    <div class="sheet-item">
      <dt>{bill.subjectLabel ?? 'Tema'}</dt>
      <dd class:text-muted={!bill.subject}>{bill.subject ?? unavailableLabel}</dd>
    </div>
    {#if bill.currentStageLabel}
      <div class="sheet-item">
        <dt>{bill.currentStageLabel}</dt>
        <dd class:text-muted={!bill.currentStage}>{bill.currentStage ?? unavailableLabel}</dd>
      </div>
    {/if}
    <div class="sheet-item">
      <dt>Situação</dt>
      <dd>{bill.status}</dd>
    </div>
    {#if bill.authorship}
      <div class="sheet-item sheet-full">
        <dt>Autoria</dt>
        <dd>{bill.authorship}</dd>
      </div>
    {/if}
    {#if bill.relationship}
      <div class="sheet-item sheet-full">
        <dt>Vínculo</dt>
        <dd>{bill.relationship}</dd>
      </div>
    {/if}
    <div class="sheet-item">
      <dt>Apresentação</dt>
      <dd class:text-muted={!bill.presentedAt}>{formatPresentedAt(bill.presentedAt)}</dd>
    </div>
    {#if bill.officialFullTextUrl}
      <div class="sheet-item sheet-full">
        <dt>Inteiro teor oficial</dt>
        <dd>
          <a
            class="official-link"
            href={bill.officialFullTextUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir inteiro teor<span class="sr-only"> abre em nova aba</span>
          </a>
        </dd>
      </div>
    {/if}
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
    flex-shrink: 0;
  }

  .badge.active {
    background: #edf7f1;
    border-color: #a8dbba;
    color: #156d39;
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

  .official-link {
    display: inline-block;
    color: var(--accent2);
    font-weight: 800;
    text-decoration: none;
    overflow-wrap: anywhere;
  }

  .official-link:hover {
    text-decoration: underline;
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
