<script lang="ts">
  import type { ParliamentarianVoteView } from '$lib/domain';
  import { hasCompleteReviewedReferenceSet } from '$lib/services/referenceService';
  import { officialCamaraProposalVotesEmptyMessage } from '$lib/ui/officialMessages';
  import BillFactsTab from './tabs/BillFactsTab.svelte';
  import BillSourcesTab from './tabs/BillSourcesTab.svelte';
  import BillSummaryTab from './tabs/BillSummaryTab.svelte';
  import BillVotesTab from './tabs/BillVotesTab.svelte';

  interface ParliamentarianBillView {
    id: string;
    parliamentarianId?: string;
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
    relationship?: string;
    authorship?: string;
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

  type DetailTabId = 'facts' | 'summary' | 'sources' | 'votes';

  let {
    bill,
    parliamentarianName,
    associatedVotes = [],
    showOfficialVotes = false,
    officialVotesTitle = 'Votações da Câmara',
    officialVotesEmptyMessage = officialCamaraProposalVotesEmptyMessage,
    onSelectVote = () => undefined,
    onBackToBills,
    onBackToParliamentarian,
    onBackToResults,
    onStartOver
  }: {
    bill: ParliamentarianBillView;
    parliamentarianName?: string;
    associatedVotes?: ParliamentarianVoteView[];
    showOfficialVotes?: boolean;
    officialVotesTitle?: string;
    officialVotesEmptyMessage?: string;
    onSelectVote?: (id: string) => void;
    onBackToBills: () => void;
    onBackToParliamentarian: () => void;
    onBackToResults?: () => void;
    onStartOver: () => void;
  } = $props();

  let activeTab = $state<DetailTabId>('facts');

  let hasCompleteReviewedReferences = $derived(hasCompleteReviewedReferenceSet(bill.sources));

  let tabs = $derived<{ id: DetailTabId; label: string }[]>([
    { id: 'facts', label: 'Dados' },
    { id: 'summary', label: 'Resumo' },
    { id: 'sources', label: 'Fontes' },
    ...(showOfficialVotes ? [{ id: 'votes' as const, label: officialVotesTitle }] : [])
  ]);

  function handleTabKeydown(e: KeyboardEvent, currentId: DetailTabId) {
    const currentIndex = tabs.findIndex((t) => t.id === currentId);
    if (currentIndex === -1) return;

    let targetIndex = -1;
    if (e.key === 'ArrowRight') {
      targetIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex >= 0) {
      e.preventDefault();
      activeTab = tabs[targetIndex].id;
      const targetButton = document.getElementById(`tab-${tabs[targetIndex].id}`);
      targetButton?.focus();
    }
  }
</script>

<div class="detail-view">
  <header class="detail-header">
    <p class="header-pre">Detalhe da proposição</p>
    <h3 class="header-title">{bill.identification}</h3>
    <p class="header-sub">
      {#if parliamentarianName}
        Registro associado a <span class="sub-name">{parliamentarianName}</span>.
      {:else}
        Registro oficial consultado diretamente.
      {/if}
    </p>
  </header>

  <div class="detail-tabs" role="tablist" aria-label="Seções do detalhe da proposição">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        role="tab"
        id={`tab-${tab.id}`}
        aria-controls={`panel-${tab.id}`}
        aria-selected={activeTab === tab.id}
        tabindex={activeTab === tab.id ? 0 : -1}
        class={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
        onclick={() => (activeTab = tab.id)}
        onkeydown={(e) => handleTabKeydown(e, tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="detail-pane">
    <div
      role="tabpanel"
      id="panel-facts"
      aria-labelledby="tab-facts"
      hidden={activeTab !== 'facts'}
      tabindex="0"
      class="tab-panel"
    >
      <BillFactsTab {bill} />
    </div>

    <div
      role="tabpanel"
      id="panel-summary"
      aria-labelledby="tab-summary"
      hidden={activeTab !== 'summary'}
      tabindex="0"
      class="tab-panel"
    >
      <BillSummaryTab
        officialSummary={bill.officialSummary}
        factualSummary={bill.factualSummary}
      />
    </div>

    <div
      role="tabpanel"
      id="panel-sources"
      aria-labelledby="tab-sources"
      hidden={activeTab !== 'sources'}
      tabindex="0"
      class="tab-panel"
    >
      <BillSourcesTab
        sources={bill.sources}
        {hasCompleteReviewedReferences}
      />
    </div>

    {#if showOfficialVotes}
      <div
        role="tabpanel"
        id="panel-votes"
        aria-labelledby="tab-votes"
        hidden={activeTab !== 'votes'}
        tabindex="0"
        class="tab-panel"
      >
        <BillVotesTab
          {associatedVotes}
          billIdentification={bill.identification}
          {parliamentarianName}
          {officialVotesTitle}
          {officialVotesEmptyMessage}
          {onSelectVote}
        />
      </div>
    {/if}
  </div>

  <div class="detail-actions">
    {#if parliamentarianName}
      <button
        type="button"
        class="btn secondary"
        onclick={onBackToBills}
      >
        ← Proposições
      </button>
      <button
        type="button"
        class="btn secondary"
        onclick={onBackToParliamentarian}
      >
        Voltar ao perfil
      </button>
    {:else if onBackToResults}
      <button
        type="button"
        class="btn secondary"
        onclick={onBackToResults}
      >
        ← Voltar aos resultados
      </button>
    {/if}
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
  .detail-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .detail-header {
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

  .sub-name {
    font-weight: 600;
    color: var(--ink);
  }

  .detail-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .detail-tab {
    min-height: 28px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--muted);
    padding: 0 10px;
    font-size: 10px;
    font-weight: 750;
    transition: all 0.14s ease;
    cursor: pointer;
  }

  .detail-tab:hover {
    background: rgba(255, 255, 255, 0.65);
    color: var(--ink);
  }

  .detail-tab.active {
    background: #ffffff;
    color: var(--accent2);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    font-weight: 850;
  }

  .detail-pane {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--accent) rgba(204, 216, 211, 0.55);
    padding-right: 3px;
  }

  .detail-pane::-webkit-scrollbar {
    width: 6px;
  }

  .detail-pane::-webkit-scrollbar-track {
    background: rgba(204, 216, 211, 0.35);
    border-radius: 99px;
  }

  .detail-pane::-webkit-scrollbar-thumb {
    background: var(--accent);
    border-radius: 99px;
  }

  .tab-panel {
    display: block;
    outline: none;
  }

  .tab-panel[hidden] {
    display: none;
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
</style>
