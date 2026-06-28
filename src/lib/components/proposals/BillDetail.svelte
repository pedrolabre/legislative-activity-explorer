<script lang="ts">
  import type { ParliamentarianBill } from '$lib/data/parliamentarianBillFixtures';

  let {
    bill,
    parliamentarianName,
    onBackToBills,
    onBackToParliamentarian,
    onStartOver
  }: {
    bill: ParliamentarianBill;
    parliamentarianName: string;
    onBackToBills: () => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  const unavailableLabel = 'Não disponível nesta visualização.';

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
      Detalhe da proposição
    </p>
    <h3 class="mt-2 break-words text-2xl font-semibold leading-8 text-ink">
      {bill.identification}
    </h3>
    <p class="mt-3 text-sm leading-6 text-ink-muted">
      Registro associado a <span class="font-medium text-ink">{parliamentarianName}</span>.
    </p>
  </header>

  <section class="border-t border-border pt-5" aria-labelledby="bill-facts-title">
    <h4 id="bill-facts-title" class="text-sm font-bold leading-6 text-ink">Dados factuais</h4>
    <dl class="mt-3 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
      <div>
        <dt class="font-bold text-ink">Identificação</dt>
        <dd>{bill.identification}</dd>
      </div>
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
        <dt class="font-bold text-ink">Vínculo</dt>
        <dd>{bill.relationship}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Apresentação</dt>
        <dd class:text-ink-muted={!bill.presentedAt}>{formatPresentedAt(bill.presentedAt)}</dd>
      </div>
    </dl>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="official-summary-title">
    <h4 id="official-summary-title" class="text-sm font-bold leading-6 text-ink">
      Ementa oficial
    </h4>
    <p class="mt-3 text-sm leading-6 text-ink-muted">{bill.officialSummary}</p>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="factual-summary-title">
    <h4 id="factual-summary-title" class="text-sm font-bold leading-6 text-ink">
      Resumo factual
    </h4>
    {#if bill.factualSummary}
      <p class="mt-3 text-sm leading-6 text-ink-muted">{bill.factualSummary}</p>
    {:else}
      <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm leading-6 text-ink-muted">
          Resumo factual não disponível nesta visualização.
        </p>
      </div>
    {/if}
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="bill-sources-title">
    <h4 id="bill-sources-title" class="text-sm font-bold leading-6 text-ink">Fontes</h4>
    {#if bill.sources.length > 0}
      <ul class="mt-3 grid gap-3">
        {#each bill.sources as source (source.id)}
          <li>
            <article class="rounded-ui border border-border bg-surface-raised p-4">
              <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
                {source.label}
              </p>
              <a
                class="mt-2 inline-block break-words text-sm font-bold leading-6 text-accent underline-offset-4 hover:underline"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}<span class="sr-only"> abre em nova aba</span>
              </a>
              <p class="mt-2 text-sm leading-6 text-ink-muted">{source.publisher}</p>
            </article>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm leading-6 text-ink-muted">
          Fontes adicionais não disponíveis nesta visualização.
        </p>
      </div>
    {/if}
  </section>

  <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
    <button
      type="button"
      class="min-h-12 rounded-ui border border-border bg-surface-raised px-4 py-3 text-sm font-bold text-ink transition hover:border-accent"
      onclick={onBackToBills}
    >
      Voltar às proposições
    </button>
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
