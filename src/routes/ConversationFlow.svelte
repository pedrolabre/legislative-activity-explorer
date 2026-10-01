<script lang="ts">
  import AboutPrivacyInfo from '$lib/components/about/AboutPrivacyInfo.svelte';
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import ParliamentarianDetail from '$lib/components/parliamentarians/ParliamentarianDetail.svelte';
  import BillDetail from '$lib/components/proposals/BillDetail.svelte';
  import ParliamentarianBills from '$lib/components/proposals/ParliamentarianBills.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import BillVotes from '$lib/components/votes/BillVotes.svelte';
  import ParliamentarianVotes from '$lib/components/votes/ParliamentarianVotes.svelte';
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

{#if searchState === 'ABOUT'}
  {@render userBubble('Área informativa', 'Sobre e privacidade')}
  <ConversationBubble tone="status">
    <AboutPrivacyInfo onBack={onBackFromAbout} onStartOver={onStartOver} />
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
        <ParliamentarianDetail
          parliamentarian={selectedParliamentarian}
          onOpenBills={onOpenParliamentarianBills}
          onOpenVotes={onOpenParliamentarianVotes}
          {onBackToResults}
          {onStartOver}
        />
      </ConversationBubble>
    {:else if searchState === 'PARLIAMENTARIAN_BILLS' && selectedParliamentarian}
      {@render userBubble('Consulta selecionada', `Proposições de ${selectedParliamentarian.name}`)}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
        <ParliamentarianBills
          parliamentarianName={selectedParliamentarian.name}
          bills={selectedParliamentarianBills}
          emptyTitle={billsFeedback.emptyTitle}
          emptyDescription={billsFeedback.emptyDescription}
          {onSelectBill}
          {onBackToParliamentarian}
          {onStartOver}
        />
      </ConversationBubble>
    {:else if searchState === 'PARLIAMENTARIAN_VOTES' && selectedParliamentarian}
      {@render userBubble('Consulta selecionada', `Votações disponíveis de ${selectedParliamentarian.name}`)}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
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
      </ConversationBubble>
    {:else if searchState === 'BILL_DETAIL' && selectedBill}
      {@render userBubble('Proposição selecionada', selectedBill.identification)}
      <ConversationBubble tone="status">
        {@render recoverableNoticeBubble(recoverableNotice)}
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
      </ConversationBubble>
    {:else if searchState === 'BILL_VOTES' && selectedVote}
      {@render userBubble('Votação selecionada', selectedVote.billIdentification)}
      <ConversationBubble tone="status">
        <BillVotes
          vote={selectedVote}
          parliamentarianName={selectedParliamentarian?.name}
          {onBackToVotes}
          {onBackToParliamentarian}
          {onStartOver}
        />
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
