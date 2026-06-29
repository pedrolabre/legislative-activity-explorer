<script lang="ts">
  interface ParliamentarianBillView {
    id: string;
    parliamentarianId: string;
    identification: string;
    chamber: string;
    subject: string;
    status: string;
    relationship: string;
    presentedAt?: string;
    officialSummary: string;
    factualSummary?: string;
    sources: {
      id: string;
      type: 'official' | 'press' | 'technical';
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
    onSelectBill,
    onBackToParliamentarian,
    onStartOver
  }: {
    parliamentarianName: string;
    bills: ParliamentarianBillView[];
    onSelectBill: (id: string) => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  const unavailableLabel = 'Não disponível nesta visualização.';

  let billCountLabel = $derived(
    bills.length === 1 ? '1 proposição associada' : `${bills.length} proposições associadas`
  );

  function formatPresentedAt(value?: string) {
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
      Proposições associadas
    </p>
    <h3 class="mt-2 break-words text-2xl font-semibold leading-8 text-ink">
      {parliamentarianName}
    </h3>
    <p class="mt-3 text-sm leading-6 text-ink-muted">{billCountLabel} nesta página.</p>
    <p class="mt-2 text-sm leading-6 text-ink-muted">
      Dados apresentados nesta página conforme a fonte disponível.
    </p>
  </header>

  {#if bills.length === 0}
    <div class="rounded-ui border border-border bg-surface-raised p-4" role="status">
      <p class="text-sm font-semibold leading-6 text-ink">
        Não há proposições associadas nesta visualização.
      </p>
      <p class="mt-2 text-sm leading-6 text-ink-muted">
        Você pode voltar ao perfil do parlamentar ou iniciar uma nova consulta.
      </p>
    </div>
  {:else}
    <section aria-labelledby="parliamentarian-bills-title">
      <h4 id="parliamentarian-bills-title" class="text-sm font-bold leading-6 text-ink">
        Lista de proposições
      </h4>
      <p class="mt-1 text-xs font-bold uppercase leading-5 tracking-normal text-ink-muted">
        Ordem por identificação legislativa.
      </p>

      <ul class="mt-3 grid gap-3">
        {#each bills as bill (bill.id)}
          <li>
            <article class="rounded-ui border border-border bg-surface-raised p-4 shadow-sm">
              <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
                {bill.relationship}
              </p>
              <h5 class="mt-2 text-base font-semibold leading-6 text-ink">
                {bill.identification}
              </h5>

              <dl class="mt-4 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
                <div>
                  <dt class="font-bold text-ink">Casa legislativa</dt>
                  <dd>{bill.chamber}</dd>
                </div>
                <div>
                  <dt class="font-bold text-ink">Tema</dt>
                  <dd>{bill.subject}</dd>
                </div>
                <div>
                  <dt class="font-bold text-ink">Situação</dt>
                  <dd>{bill.status}</dd>
                </div>
                <div>
                  <dt class="font-bold text-ink">Apresentação</dt>
                  <dd class:text-ink-muted={!bill.presentedAt}>{formatPresentedAt(bill.presentedAt)}</dd>
                </div>
              </dl>

              <button
                type="button"
                class="mt-4 min-h-11 rounded-ui bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-strong"
                aria-label={`Ver detalhes de ${bill.identification}`}
                onclick={() => onSelectBill(bill.id)}
              >
                Ver detalhes
              </button>
            </article>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
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
