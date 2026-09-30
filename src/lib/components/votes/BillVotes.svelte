<script lang="ts">
  import type { ParliamentarianVoteView } from '$lib/domain';
  import VoteCountsTab from './tabs/VoteCountsTab.svelte';
  import VoteNominalTab from './tabs/VoteNominalTab.svelte';
  import VoteSummaryTab from './tabs/VoteSummaryTab.svelte';

  type VoteTabId = 'summary' | 'counts' | 'nominal';

  let {
    vote,
    parliamentarianName,
    onBackToVotes,
    onBackToParliamentarian,
    onStartOver
  }: {
    vote: ParliamentarianVoteView;
    parliamentarianName?: string;
    onBackToVotes: () => void;
    onBackToParliamentarian: () => void;
    onStartOver: () => void;
  } = $props();

  let activeTab = $state<VoteTabId>('summary');

  const tabs: { id: VoteTabId; label: string }[] = [
    { id: 'summary', label: 'Resumo' },
    { id: 'counts', label: 'Contagens' },
    { id: 'nominal', label: 'Lista nominal' }
  ];

  function handleTabKeydown(e: KeyboardEvent, currentId: VoteTabId) {
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
    <p class="header-pre">Detalhe da votação</p>
    <h3 class="header-title">{vote.billIdentification}</h3>
    <p class="header-sub">
      {#if parliamentarianName}
        Registro associado a <span class="sub-name">{parliamentarianName}</span>.
      {:else}
        Registro oficial da proposição aberta.
      {/if}
    </p>
  </header>

  <div class="detail-tabs" role="tablist" aria-label="Seções do detalhe da votação">
    {#each tabs as tab}
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
      id="panel-summary"
      aria-labelledby="tab-summary"
      hidden={activeTab !== 'summary'}
      tabindex="0"
      class="tab-panel"
    >
      <VoteSummaryTab {vote} {parliamentarianName} />
    </div>

    <div
      role="tabpanel"
      id="panel-counts"
      aria-labelledby="tab-counts"
      hidden={activeTab !== 'counts'}
      tabindex="0"
      class="tab-panel"
    >
      <VoteCountsTab counts={vote.counts} />
    </div>

    <div
      role="tabpanel"
      id="panel-nominal"
      aria-labelledby="tab-nominal"
      hidden={activeTab !== 'nominal'}
      tabindex="0"
      class="tab-panel"
    >
      <VoteNominalTab individualVotes={vote.individualVotes} chamber={vote.chamber} />
    </div>
  </div>

  <div class="detail-actions">
    <button
      type="button"
      class="btn secondary"
      onclick={onBackToVotes}
    >
      ← Voltar às votações
    </button>
    {#if parliamentarianName}
      <button
        type="button"
        class="btn secondary"
        onclick={onBackToParliamentarian}
      >
        Voltar ao perfil
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
