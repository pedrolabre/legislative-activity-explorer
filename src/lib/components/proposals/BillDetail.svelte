<script lang="ts">
  import VoteBadge from '$lib/components/votes/VoteBadge.svelte';
  import type { ParliamentarianVoteView } from '$lib/domain';
  import { hasCompleteReviewedReferenceSet } from '$lib/services/referenceService';
  import { formatCheckedAt, formatPresentedAt, formatVotedAt } from '$lib/ui/dateFormatters';
  import {
    officialCamaraProposalVotesEmptyMessage,
    unavailableOfficialFieldLabel as unavailableLabel
  } from '$lib/ui/officialMessages';

  interface ParliamentarianBillView {
    id: string;
    parliamentarianId: string;
    identification: string;
    chamber: string;
    type: string;
    number?: string;
    year?: number;
    subjectLabel?: string;
    subject?: string;
    status: string;
    currentStageLabel?: string;
    currentStage?: string;
    relationship: string;
    presentedAt?: string;
    officialSummary: string;
    factualSummary?: string;
    officialFullTextUrl?: string;
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
    bill,
    parliamentarianName,
    associatedVotes = [],
    showOfficialVotes = false,
    unavailableVotesTitle,
    unavailableVotesDescription,
    onSelectVote = () => undefined,
    onBackToBills,
    onBackToParliamentarian,
    onStartOver
  }: {
    bill: ParliamentarianBillView;
    parliamentarianName: string;
    associatedVotes?: ParliamentarianVoteView[];
    showOfficialVotes?: boolean;
    unavailableVotesTitle?: string;
    unavailableVotesDescription?: string;
    onSelectVote?: (id: string) => void;
    onBackToBills: () => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  const unavailableOfficialSourceMessage =
    'Fonte oficial da proposição não foi retornada no dado disponível nesta consulta.';
  const noReviewedReferencesMessage =
    'Conjunto completo de referências externas revisadas ainda não foi adicionado para esta proposição.';
  const unavailableReviewedFactualSummaryMessage =
    'Resumo factual revisado ainda não foi adicionado para esta proposição.';

  let hasCompleteReviewedReferences = $derived(hasCompleteReviewedReferenceSet(bill.sources));
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
        <dt class="font-bold text-ink">Tipo</dt>
        <dd>{bill.type}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Número</dt>
        <dd class:text-ink-muted={!bill.number}>{bill.number ?? unavailableLabel}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Ano</dt>
        <dd class:text-ink-muted={!bill.year}>{bill.year ?? unavailableLabel}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">{bill.subjectLabel ?? 'Tema'}</dt>
        <dd class:text-ink-muted={!bill.subject}>{bill.subject ?? unavailableLabel}</dd>
      </div>
      {#if bill.currentStageLabel}
        <div>
          <dt class="font-bold text-ink">{bill.currentStageLabel}</dt>
          <dd class:text-ink-muted={!bill.currentStage}>{bill.currentStage ?? unavailableLabel}</dd>
        </div>
      {/if}
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
      {#if bill.officialFullTextUrl}
        <div class="sm:col-span-2">
          <dt class="font-bold text-ink">Inteiro teor oficial</dt>
          <dd>
            <a
              class="break-words font-bold text-accent underline-offset-4 hover:underline"
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
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="official-summary-title">
    <h4 id="official-summary-title" class="text-sm font-bold leading-6 text-ink">
      Ementa oficial
    </h4>
    <p class="mt-3 text-sm leading-6 text-ink-muted">{bill.officialSummary}</p>
  </section>

  {#if bill.factualSummary}
    <section class="border-t border-border pt-5" aria-labelledby="factual-summary-title">
      <h4 id="factual-summary-title" class="text-sm font-bold leading-6 text-ink">
        Resumo factual revisado
      </h4>
      <p class="mt-3 text-sm leading-6 text-ink-muted">{bill.factualSummary}</p>
    </section>
  {:else}
    <div class="border-t border-border pt-5">
      <div class="rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm leading-6 text-ink-muted">
          {unavailableReviewedFactualSummaryMessage}
        </p>
      </div>
    </div>
  {/if}

  <section class="border-t border-border pt-5" aria-labelledby="bill-sources-title">
    <h4 id="bill-sources-title" class="text-sm font-bold leading-6 text-ink">
      Fontes e referências
    </h4>
    {#if bill.sources.length > 0}
      <ul class="mt-3 grid gap-3">
        {#each bill.sources as source (source.id)}
          <li>
            <article class="rounded-ui border border-border bg-surface-raised p-4">
              <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
                Tipo: {source.label}
              </p>
              <a
                class="mt-2 inline-block break-words text-sm font-bold leading-6 text-accent underline-offset-4 hover:underline"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source.title}<span class="sr-only"> abre em nova aba</span>
              </a>
              <dl class="mt-2 grid gap-1 text-sm leading-6 text-ink-muted">
                <div>
                  <dt class="font-bold text-ink">Publicador</dt>
                  <dd>{source.publisher}</dd>
                </div>
                {#if formatCheckedAt(source.checkedAt)}
                  <div>
                    <dt class="font-bold text-ink">Data de revisão</dt>
                    <dd>{formatCheckedAt(source.checkedAt)}</dd>
                  </div>
                {/if}
              </dl>
            </article>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm leading-6 text-ink-muted">
          {unavailableOfficialSourceMessage}
        </p>
      </div>
    {/if}
    {#if !hasCompleteReviewedReferences}
      <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm leading-6 text-ink-muted">
          {noReviewedReferencesMessage}
        </p>
      </div>
    {/if}
  </section>

  {#if showOfficialVotes}
    <section class="border-t border-border pt-5" aria-labelledby="bill-votes-title">
      <h4 id="bill-votes-title" class="text-sm font-bold leading-6 text-ink">
        Votações da Câmara
      </h4>
      {#if associatedVotes.length > 0}
        <p class="mt-1 text-xs font-bold uppercase leading-5 tracking-normal text-ink-muted">
          Registros oficiais associados à proposição aberta.
        </p>
        <ul class="mt-3 grid gap-3">
          {#each associatedVotes as vote (vote.id)}
            <li>
              <article class="rounded-ui border border-border bg-surface-raised p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="min-w-0">
                    <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
                      Votação
                    </p>
                    <h5 class="mt-2 break-words text-base font-semibold leading-6 text-ink">
                      {vote.description}
                    </h5>
                  </div>
                  <div class="shrink-0">
                    {#if vote.parliamentarianVote}
                      <p class="sr-only">Voto registrado</p>
                      <VoteBadge vote={vote.parliamentarianVote} />
                    {:else}
                      <p class="max-w-52 text-sm leading-6 text-ink-muted" role="status">
                        {vote.parliamentarianVoteNotice}
                      </p>
                    {/if}
                  </div>
                </div>

                <dl class="mt-4 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
                  <div>
                    <dt class="font-bold text-ink">Data</dt>
                    <dd class:text-ink-muted={!vote.votedAt}>{formatVotedAt(vote.votedAt)}</dd>
                  </div>
                  <div>
                    <dt class="font-bold text-ink">Resultado oficial</dt>
                    <dd class:text-ink-muted={!vote.officialResult}>
                      {vote.officialResult ?? unavailableLabel}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  class="mt-4 min-h-11 rounded-ui bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-strong"
                  aria-label={`Ver votação de ${bill.identification}`}
                  onclick={() => onSelectVote(vote.id)}
                >
                  Ver votação
                </button>
              </article>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
          <p class="text-sm leading-6 text-ink-muted">
            {officialCamaraProposalVotesEmptyMessage}
          </p>
        </div>
      {/if}
    </section>
  {:else if unavailableVotesTitle}
    <section class="border-t border-border pt-5" aria-labelledby="bill-unavailable-votes-title">
      <h4 id="bill-unavailable-votes-title" class="text-sm font-bold leading-6 text-ink">
        Votações do Senado
      </h4>
      <div class="mt-3 rounded-ui border border-border bg-surface-raised p-4" role="status">
        <p class="text-sm font-semibold leading-6 text-ink">
          {unavailableVotesTitle}
        </p>
        {#if unavailableVotesDescription}
          <p class="mt-2 text-sm leading-6 text-ink-muted">
            {unavailableVotesDescription}
          </p>
        {/if}
      </div>
    </section>
  {/if}

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
