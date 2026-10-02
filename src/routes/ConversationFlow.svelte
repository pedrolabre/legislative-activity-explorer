<script module lang="ts">
  import { SvelteMap } from 'svelte/reactivity';

  export type PanelKey =
    | 'ABOUT'
    | 'PARLIAMENTARIAN_DETAIL'
    | 'PARLIAMENTARIAN_BILLS'
    | 'PARLIAMENTARIAN_VOTES'
    | 'BILL_DETAIL'
    | 'BILL_VOTES';

  export type AboutModule = typeof import('$lib/components/about/AboutPrivacyInfo.svelte');
  export type ParliamentarianDetailModule =
    typeof import('$lib/components/parliamentarians/ParliamentarianDetail.svelte');
  export type ParliamentarianBillsModule =
    typeof import('$lib/components/proposals/ParliamentarianBills.svelte');
  export type ParliamentarianVotesModule =
    typeof import('$lib/components/votes/ParliamentarianVotes.svelte');
  export type BillDetailModule = typeof import('$lib/components/proposals/BillDetail.svelte');
  export type BillVotesModule = typeof import('$lib/components/votes/BillVotes.svelte');

  export type PanelModuleMap = {
    ABOUT: AboutModule;
    PARLIAMENTARIAN_DETAIL: ParliamentarianDetailModule;
    PARLIAMENTARIAN_BILLS: ParliamentarianBillsModule;
    PARLIAMENTARIAN_VOTES: ParliamentarianVotesModule;
    BILL_DETAIL: BillDetailModule;
    BILL_VOTES: BillVotesModule;
  };

  export type PanelModule = PanelModuleMap[PanelKey];

  export const panelLoaders: {
    [K in PanelKey]: () => Promise<PanelModuleMap[K]>;
  } = {
    ABOUT: () => import('$lib/components/about/AboutPrivacyInfo.svelte'),
    PARLIAMENTARIAN_DETAIL: () =>
      import('$lib/components/parliamentarians/ParliamentarianDetail.svelte'),
    PARLIAMENTARIAN_BILLS: () =>
      import('$lib/components/proposals/ParliamentarianBills.svelte'),
    PARLIAMENTARIAN_VOTES: () =>
      import('$lib/components/votes/ParliamentarianVotes.svelte'),
    BILL_DETAIL: () => import('$lib/components/proposals/BillDetail.svelte'),
    BILL_VOTES: () => import('$lib/components/votes/BillVotes.svelte')
  };

  const panelCache = new SvelteMap<PanelKey, PanelModule>();

  export function getCachedPanel<K extends PanelKey>(key: K): PanelModuleMap[K] | undefined {
    return panelCache.get(key) as PanelModuleMap[K] | undefined;
  }

  export function setCachedPanel<K extends PanelKey>(key: K, mod: PanelModuleMap[K]): void {
    panelCache.set(key, mod);
  }

  export function clearPanelCache(): void {
    panelCache.clear();
  }

  export async function preloadPanel<K extends PanelKey>(key: K): Promise<PanelModuleMap[K]> {
    const cached = panelCache.get(key);
    if (cached) return cached as PanelModuleMap[K];
    const mod = await panelLoaders[key]();
    panelCache.set(key, mod);
    return mod;
  }

  export async function preloadAllPanels(): Promise<void> {
    await Promise.all(
      (Object.keys(panelLoaders) as PanelKey[]).map((key) => preloadPanel(key))
    );
  }
</script>

<script lang="ts">
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import type { ParliamentarianVoteView, UIState } from '$lib/domain';
  import type {
    ParliamentarianBillView,
    ParliamentarianBillsFeedback,
    ParliamentarianDetailView,
    ParliamentarianVotesFeedback,
    ProposalVotesFeedback,
    SearchResultsView
  } from './pageViewModelMappers';

  interface Props {
    searchState: UIState;
    submittedSearch: { id: number; query: string } | null;
    errorMessage?: string;
    recoverableNotice?: string;
    searchResults: SearchResultsView;
    selectedParliamentarian: ParliamentarianDetailView | null;
    selectedBill: ParliamentarianBillView | null;
    selectedVote: ParliamentarianVoteView | null;
    selectedParliamentarianBills: ParliamentarianBillView[];
    selectedParliamentarianVotes: ParliamentarianVoteView[];
    selectedBillVotes: ParliamentarianVoteView[];
    billsFeedback?: ParliamentarianBillsFeedback;
    votesFeedback?: ParliamentarianVotesFeedback;
    proposalVotesFeedback?: ProposalVotesFeedback;
    onSelectParliamentarian: (id: string) => void;
    onSelectBill: (id: string) => void;
    onSelectVote: (id: string) => void;
    onOpenParliamentarianBills: () => void;
    onOpenParliamentarianVotes: () => void;
    onBackFromAbout: () => void;
    onBackToResults: () => void;
    onBackToParliamentarian: () => void;
    onBackToBills: () => void;
    onBackToVotes: () => void;
    onStartOver: () => void;
  }

  let {
    searchState,
    submittedSearch,
    errorMessage = '',
    recoverableNotice = '',
    searchResults,
    selectedParliamentarian,
    selectedBill,
    selectedVote,
    selectedParliamentarianBills,
    selectedParliamentarianVotes,
    selectedBillVotes,
    billsFeedback = {},
    votesFeedback = {},
    proposalVotesFeedback = { showOfficialVotes: false, officialVotesTitle: 'Votações da Câmara' },
    onSelectParliamentarian,
    onSelectBill,
    onSelectVote,
    onOpenParliamentarianBills,
    onOpenParliamentarianVotes,
    onBackFromAbout,
    onBackToResults,
    onBackToParliamentarian,
    onBackToBills,
    onBackToVotes,
    onStartOver
  }: Props = $props();

  let retryTokens = $state<Record<string, number>>({});

  function resolvePanel<K extends PanelKey>(
    key: K
  ): PanelModuleMap[K] | Promise<PanelModuleMap[K]> {
    const _retry = retryTokens[key];
    void _retry;

    const cached = panelCache.get(key);
    if (cached) return cached as PanelModuleMap[K];

    return panelLoaders[key]().then((mod) => {
      panelCache.set(key, mod);
      return mod;
    });
  }

  function handleRetryPanel(key: PanelKey) {
    panelCache.delete(key);
    retryTokens[key] = (retryTokens[key] || 0) + 1;
  }
</script>

{#snippet userBubble(label: string, text: string)}
  <ConversationBubble tone="user">
    <small>{label}</small>
    <strong>{text}</strong>
  </ConversationBubble>
{/snippet}

{#snippet recoverableNoticeBubble(notice?: string)}
  {#if notice}
    <p class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted" role="status">
      {notice}
    </p>
  {/if}
{/snippet}

{#snippet panelSkeleton(label: string, lines = 3)}
  <div
    class="panel-loading-skeleton rounded-lg border border-border bg-panel-bg p-5"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Carregando {label}..."
    data-testid="panel-loading-skeleton"
  >
    <div class="mb-4 flex items-center gap-3">
      <div class="h-8 w-8 animate-pulse rounded-full bg-sand-200"></div>
      <div class="h-4 w-44 animate-pulse rounded bg-sand-200"></div>
    </div>
    <div class="space-y-2.5">
      <div class="h-3 w-full animate-pulse rounded bg-sand-100"></div>
      <div class="h-3 w-5/6 animate-pulse rounded bg-sand-100"></div>
      {#if lines > 2}
        <div class="h-3 w-4/6 animate-pulse rounded bg-sand-100"></div>
      {/if}
    </div>
    <p class="sr-only">Carregando conteúdo de {label}...</p>
  </div>
{/snippet}

{#snippet panelErrorFallback(label: string, key: PanelKey)}
  <div
    class="panel-loading-error rounded-lg border border-amber-300 bg-amber-50 p-5 text-ink"
    role="alert"
    data-testid="panel-loading-error"
  >
    <div class="flex items-start gap-3">
      <b class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800 text-xs font-bold">!</b>
      <div class="flex-1">
        <h4 class="font-semibold text-sm text-ink">Falha ao carregar painel: {label}</h4>
        <p class="mt-1 text-xs text-ink-muted">
          Não foi possível carregar os dados deste componente sob demanda. Verifique sua conexão e tente novamente.
        </p>
        <button
          type="button"
          class="btn primary mt-3 text-xs"
          onclick={() => handleRetryPanel(key)}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  </div>
{/snippet}

{#if searchState === 'ABOUT'}
  {@render userBubble('Área informativa', 'Sobre e privacidade')}
  <ConversationBubble tone="status">
    {#await resolvePanel('ABOUT')}
      {@render panelSkeleton('Sobre e privacidade')}
    {:then { default: AboutPrivacyInfo }}
      <AboutPrivacyInfo onBack={onBackFromAbout} onStartOver={onStartOver} />
    {:catch}
      {@render panelErrorFallback('Sobre e privacidade', 'ABOUT')}
    {/await}
  </ConversationBubble>
{:else if submittedSearch}
  {#key submittedSearch.id}
    {@render userBubble('Termo informado', submittedSearch.query)}

    {#if searchState === 'SEARCHING'}
      <ConversationBubble tone="status">
        <p class="font-semibold" role="status">
          Consultando registros oficiais disponíveis.
        </p>
        <p class="mt-2 text-sm leading-6 text-ink-muted">
          Aguarde enquanto a busca consulta as fontes públicas legislativas.
        </p>
      </ConversationBubble>
    {:else if searchState === 'SEARCH_RESULTS'}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
        <SearchResults
          query={submittedSearch.query}
          results={searchResults}
          {onSelectParliamentarian}
          onSelectProposal={onSelectBill}
        />
      </ConversationBubble>
    {:else if searchState === 'ERROR'}
      <ConversationBubble tone="status">
        <div role="alert" class="empty">
          <div>
            <b class="text-gold">!</b>
            <h3 class="font-semibold">A busca não foi concluída.</h3>
            <p class="mt-2 text-sm leading-6 text-ink-muted">
              {errorMessage}
            </p>
            <button
              type="button"
              class="btn primary mt-4"
              onclick={onStartOver}
            >
              Nova consulta
            </button>
          </div>
        </div>
      </ConversationBubble>
    {:else if searchState === 'PARLIAMENTARIAN_DETAIL' && selectedParliamentarian}
      {@render userBubble('Parlamentar selecionado', selectedParliamentarian.name)}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
        {#await resolvePanel('PARLIAMENTARIAN_DETAIL')}
          {@render panelSkeleton(selectedParliamentarian.name)}
        {:then { default: ParliamentarianDetail }}
          <ParliamentarianDetail
            parliamentarian={selectedParliamentarian}
            onOpenBills={onOpenParliamentarianBills}
            onOpenVotes={onOpenParliamentarianVotes}
            {onBackToResults}
            {onStartOver}
          />
        {:catch}
          {@render panelErrorFallback('Detalhes do parlamentar', 'PARLIAMENTARIAN_DETAIL')}
        {/await}
      </ConversationBubble>
    {:else if searchState === 'PARLIAMENTARIAN_BILLS' && selectedParliamentarian}
      {@render userBubble('Consulta selecionada', `Proposições de ${selectedParliamentarian.name}`)}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
        {#await resolvePanel('PARLIAMENTARIAN_BILLS')}
          {@render panelSkeleton(`Proposições de ${selectedParliamentarian.name}`, 4)}
        {:then { default: ParliamentarianBills }}
          <ParliamentarianBills
            parliamentarianName={selectedParliamentarian.name}
            bills={selectedParliamentarianBills}
            emptyTitle={billsFeedback.emptyTitle}
            emptyDescription={billsFeedback.emptyDescription}
            {onSelectBill}
            {onBackToParliamentarian}
            {onStartOver}
          />
        {:catch}
          {@render panelErrorFallback('Proposições do parlamentar', 'PARLIAMENTARIAN_BILLS')}
        {/await}
      </ConversationBubble>
    {:else if searchState === 'PARLIAMENTARIAN_VOTES' && selectedParliamentarian}
      {@render userBubble('Consulta selecionada', `Votações disponíveis de ${selectedParliamentarian.name}`)}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
        {#await resolvePanel('PARLIAMENTARIAN_VOTES')}
          {@render panelSkeleton(`Votações de ${selectedParliamentarian.name}`, 4)}
        {:then { default: ParliamentarianVotes }}
          <ParliamentarianVotes
            parliamentarianName={selectedParliamentarian.name}
            votes={selectedParliamentarianVotes}
            coverageDescription={votesFeedback.coverageDescription}
            emptyTitle={votesFeedback.emptyTitle}
            emptyDescription={votesFeedback.emptyDescription}
            {onSelectVote}
            {onBackToParliamentarian}
            {onStartOver}
          />
        {:catch}
          {@render panelErrorFallback('Votações do parlamentar', 'PARLIAMENTARIAN_VOTES')}
        {/await}
      </ConversationBubble>
    {:else if searchState === 'BILL_DETAIL' && selectedBill}
      {@render userBubble('Proposição selecionada', selectedBill.identification)}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
        {#await resolvePanel('BILL_DETAIL')}
          {@render panelSkeleton(selectedBill.identification, 4)}
        {:then { default: BillDetail }}
          <BillDetail
            bill={selectedBill}
            parliamentarianName={selectedParliamentarian?.name}
            associatedVotes={selectedBillVotes}
            showOfficialVotes={proposalVotesFeedback.showOfficialVotes}
            officialVotesTitle={proposalVotesFeedback.officialVotesTitle}
            officialVotesEmptyMessage={proposalVotesFeedback.officialVotesEmptyMessage}
            {onSelectVote}
            {onBackToBills}
            {onBackToParliamentarian}
            {onBackToResults}
            {onStartOver}
          />
        {:catch}
          {@render panelErrorFallback('Detalhe da proposição', 'BILL_DETAIL')}
        {/await}
      </ConversationBubble>
    {:else if searchState === 'BILL_VOTES' && selectedVote}
      {@render userBubble('Votação selecionada', selectedVote.billIdentification)}
      <ConversationBubble tone="status">
        {#await resolvePanel('BILL_VOTES')}
          {@render panelSkeleton(selectedVote.billIdentification, 4)}
        {:then { default: BillVotes }}
          <BillVotes
            vote={selectedVote}
            parliamentarianName={selectedParliamentarian?.name}
            {onBackToVotes}
            {onBackToParliamentarian}
            {onStartOver}
          />
        {:catch}
          {@render panelErrorFallback('Votação da proposição', 'BILL_VOTES')}
        {/await}
      </ConversationBubble>
    {/if}
  {/key}
{:else}
  <ConversationBubble>
    <div class="empty">
      <div>
        <b>?</b>
        <h3>Consulta pública de atividade parlamentar</h3>
        <p>Informe um parlamentar ou uma proposição para iniciar a consulta.</p>
      </div>
    </div>
  </ConversationBubble>
{/if}

<style>
  .empty {
    height: 100%;
    display: grid;
    place-items: center;
    text-align: center;
  }

  .empty div {
    max-width: 500px;
  }

  .empty b {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin: 0 auto 9px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: #ffffff;
    color: var(--accent);
  }

  .empty h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
  }

  .empty p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }
</style>
