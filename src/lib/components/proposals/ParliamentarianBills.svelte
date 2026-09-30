<script lang="ts">
  import { formatPresentedAt } from '$lib/ui/dateFormatters';

  interface ParliamentarianBillView {
    id: string;
    parliamentarianId: string;
    identification: string;
    chamber: string;
    subjectLabel?: string;
    subject?: string;
    status: string;
    relationship: string;
    presentedAt?: string;
    officialSummary: string;
    factualSummary?: string;
    sources: {
      id: string;
      type: 'official' | 'press' | 'technical' | 'institutional';
      label: string;
      title: string;
      publisher: string;
      url: string;
      checkedAt?: string;
    }[];
  }

  let {
    parliamentarianName,
    bills,
    emptyTitle = 'Nenhuma proposição associada a este parlamentar foi retornada pela fonte oficial consultada.',
    emptyDescription = 'A fonte consultada não retornou registros para esta seleção nesta consulta.',
    onSelectBill,
    onBackToParliamentarian,
    onStartOver
  }: {
    parliamentarianName: string;
    bills: ParliamentarianBillView[];
    emptyTitle?: string;
    emptyDescription?: string;
    onSelectBill: (id: string) => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  let visibleCount = $state(10);

  let billCountLabel = $derived(
    bills.length === 1 ? '1 proposição associada' : `${bills.length} proposições associadas`
  );

  let visibleBills = $derived(bills.slice(0, visibleCount));
  let loadedCount = $derived(Math.min(visibleCount, bills.length));
  let remaining = $derived(Math.max(0, bills.length - visibleCount));

  function handleLoadMore() {
    visibleCount += 10;
  }
</script>

<div class="bills-container">
  <header class="bills-header">
    <p class="header-pre">Proposições associadas</p>
    <h3 class="header-title">{parliamentarianName}</h3>
    <p class="header-sub">{billCountLabel} na consulta atual.</p>
    <p class="header-sub">Registros retornados pela fonte oficial consultada.</p>
  </header>

  {#if bills.length === 0}
    <div class="empty" role="status">
      <div>
        <b aria-hidden="true">0</b>
        <h3>{emptyTitle}</h3>
        <p>{emptyDescription}</p>
      </div>
    </div>
  {:else}
    <section class="bills-content" aria-labelledby="parliamentarian-bills-title">
      <div class="list-head">
        <h4 id="parliamentarian-bills-title" class="list-head-title">Lista de proposições</h4>
        <div class="pager" aria-live="polite">
          <span>{loadedCount} carregadas</span>
        </div>
      </div>

      <div class="bill-scroll" id="bill-scroll">
        <div class="bill-list">
          {#each visibleBills as bill (bill.id)}
            <article class="bill">
              <div class="bill-main">
                <div class="bill-id">{bill.identification}</div>
                <div class="bill-kind">{bill.relationship}</div>
              </div>

              <div class="bill-meta">
                <strong>Casa</strong>
                <span>{bill.chamber}</span>
              </div>

              <div class="bill-meta">
                <strong>Apresentação</strong>
                <span>{formatPresentedAt(bill.presentedAt)}</span>
              </div>

              <button
                type="button"
                class="bill-link"
                aria-label={`Ver detalhes de ${bill.identification}`}
                onclick={() => onSelectBill(bill.id)}
              >
                Ver detalhes →
              </button>
            </article>
          {/each}
        </div>

        {#if remaining > 0}
          <div class="load-more">
            <button
              type="button"
              class="btn secondary"
              onclick={handleLoadMore}
            >
              Carregar mais {Math.min(10, remaining)}
            </button>
            <span>{remaining} restantes</span>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <div class="detail-actions">
    <button
      type="button"
      class="btn secondary"
      onclick={onBackToParliamentarian}
    >
      Voltar ao perfil
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
  .bills-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .bills-header {
    flex-shrink: 0;
    margin-bottom: 8px;
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

  .bills-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .list-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 10px;
    margin: 6px 0 7px;
    flex-shrink: 0;
  }

  .list-head-title {
    margin: 0;
    font-size: 11px;
    font-weight: 800;
    color: var(--ink);
  }

  .pager {
    display: flex;
    gap: 5px;
    align-items: center;
    color: var(--muted);
    font-size: 9px;
    font-weight: 700;
  }

  .bill-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 7px;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--accent) rgba(204, 216, 211, 0.55);
  }

  .bill-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .bill-scroll::-webkit-scrollbar-track {
    background: rgba(204, 216, 211, 0.45);
    border-radius: 999px;
  }

  .bill-scroll::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 999px;
  }

  .bill-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--accent2);
  }

  .bill-list {
    height: auto;
    display: block;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .bill {
    min-height: 58px;
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    padding: 10px 6px;
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr) 120px auto;
    gap: 16px;
    align-items: center;
    transition: background-color 0.14s ease;
  }

  .bill:last-child {
    border-bottom: 0;
  }

  .bill:hover {
    background: rgba(255, 255, 255, 0.42);
  }

  .bill-main {
    min-width: 0;
  }

  .bill-id {
    font-size: 11px;
    font-weight: 850;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .bill-kind {
    margin-top: 2px;
    color: var(--accent);
    font-size: 7px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .bill-meta {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.35;
    min-width: 0;
  }

  .bill-meta strong {
    display: block;
    margin-bottom: 1px;
    color: var(--ink);
    font-weight: 750;
  }

  .bill-link {
    min-height: 28px;
    border: 0;
    background: transparent;
    color: var(--accent2);
    padding: 0 2px;
    font-size: 9px;
    font-weight: 850;
    white-space: nowrap;
    cursor: pointer;
    text-align: right;
  }

  .bill-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .load-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 0 4px;
  }

  .load-more .btn {
    min-height: 30px;
    font-size: 10px;
  }

  .load-more span {
    color: var(--muted);
    font-size: 9px;
    font-weight: 600;
  }

  .empty {
    display: grid;
    place-items: center;
    text-align: center;
    padding: 24px 16px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-top: 8px;
  }

  .empty b {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin: 0 auto 9px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: #fff;
    color: var(--accent);
    font-weight: 800;
  }

  .empty h3 {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
  }

  .empty p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
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

  @media (max-width: 900px) {
    .bill {
      grid-template-columns: 100px minmax(0, 1fr) auto;
      gap: 10px;
    }

    .bill .bill-meta:nth-of-type(2) {
      display: none;
    }
  }

  @media (max-width: 700px) {
    .bill {
      grid-template-columns: 92px minmax(0, 1fr) auto;
      gap: 8px;
    }
  }
</style>
