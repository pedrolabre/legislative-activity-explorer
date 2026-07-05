<script lang="ts">
  import { onDestroy } from 'svelte';
  import AboutPrivacyInfo from '$lib/components/about/AboutPrivacyInfo.svelte';
  import ProductLogo from '$lib/components/brand/ProductLogo.svelte';
  import ConversationBubble from '$lib/components/conversation/ConversationBubble.svelte';
  import ConversationLog from '$lib/components/conversation/ConversationLog.svelte';
  import ParliamentarianDetail from '$lib/components/parliamentarians/ParliamentarianDetail.svelte';
  import BillDetail from '$lib/components/proposals/BillDetail.svelte';
  import ParliamentarianBills from '$lib/components/proposals/ParliamentarianBills.svelte';
  import SearchResults from '$lib/components/search/SearchResults.svelte';
  import InitialSearchForm from '$lib/components/search/InitialSearchForm.svelte';
  import BillVotes from '$lib/components/votes/BillVotes.svelte';
  import ParliamentarianVotes from '$lib/components/votes/ParliamentarianVotes.svelte';
  import {
    toDisplayVotePosition,
    type DisplayVotePosition,
    type LegislativeProposal,
    type Parliamentarian,
    type ParliamentarianVoteView,
    type RollCallVote
  } from '$lib/domain';
  import {
    unavailableNominalVoteListLabel,
    unavailableOfficialFieldLabel,
    unavailableVersionFieldLabel
  } from '$lib/ui/officialMessages';
  import {
    chatStore,
    executeSearch,
    goBack,
    initialChatContext,
    navigateTo,
    officialParliamentarianSessionVotesEmptyMessage,
    officialParliamentarianSessionVotesCoverageMessage,
    officialParliamentarianStaticCoverageDescription,
    officialSenadoAssociatedMattersUnavailableDescription,
    officialSenadoAssociatedMattersUnavailableMessage,
    officialSenadoProposalVotesUnavailableMessage,
    officialSenadoStaticCoverageDescription,
    openParliamentarianBills,
    openParliamentarianVotes,
    reset,
    selectParliamentarianById,
    selectProposalById,
    selectVoteById,
    type ChatContext
  } from '$lib/state/chatStore';

  interface SearchResultsView {
    parliamentarians: {
      kind: 'parliamentarian';
      id: string;
      name: string;
      office: string;
      party: string;
      state: string;
      status: string;
      searchTerms: string[];
    }[];
    proposals: {
      kind: 'proposal';
      id: string;
      title: string;
      chamber: string;
      subjectLabel?: string;
      subject?: string;
      status: string;
      searchTerms: string[];
    }[];
  }

  interface ParliamentarianDetailView {
    id: string;
    name: string;
    fullName?: string;
    office: string;
    chamber: string;
    party: string;
    state: string;
    status: string;
    term?: string;
    termLabel?: string;
    email?: string;
    photoUrl?: string;
  }

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

  let chatContext = $state<ChatContext>(initialChatContext);
  let searchRenderKey = $state(0);
  let searchFormResetToken = $state(0);
  const unsubscribeChatStore = chatStore.subscribe((context) => {
    chatContext = context;
  });

  function getChamberLabel(source: Parliamentarian['source'] | LegislativeProposal['source']) {
    return source === 'senado' ? 'Senado Federal' : 'Câmara dos Deputados';
  }

  function getSubjectLabel(proposal: LegislativeProposal) {
    return isOfficialSenadoProposal(proposal) ? 'Natureza' : 'Tema';
  }

  function toSearchParliamentarianResult(parliamentarian: Parliamentarian) {
    return {
      kind: 'parliamentarian' as const,
      id: parliamentarian.id,
      name: parliamentarian.name,
      office: parliamentarian.office,
      party: parliamentarian.party ?? unavailableOfficialFieldLabel,
      state: parliamentarian.state ?? unavailableOfficialFieldLabel,
      status: parliamentarian.status ?? unavailableOfficialFieldLabel,
      searchTerms: []
    };
  }

  function toSearchProposalResult(proposal: LegislativeProposal) {
    return {
      kind: 'proposal' as const,
      id: proposal.id,
      title: proposal.title,
      chamber: getChamberLabel(proposal.source),
      subjectLabel: proposal.subject ? getSubjectLabel(proposal) : undefined,
      subject: proposal.subject,
      status: proposal.status ?? unavailableOfficialFieldLabel,
      searchTerms: []
    };
  }

  function toParliamentarianDetailView(
    parliamentarian: Parliamentarian
  ): ParliamentarianDetailView {
    return {
      id: parliamentarian.id,
      name: parliamentarian.name,
      fullName: parliamentarian.fullName,
      office: parliamentarian.office,
      chamber: getChamberLabel(parliamentarian.source),
      party: parliamentarian.party ?? unavailableOfficialFieldLabel,
      state: parliamentarian.state ?? unavailableOfficialFieldLabel,
      status: parliamentarian.status ?? unavailableOfficialFieldLabel,
      term: parliamentarian.term,
      termLabel: parliamentarian.termLabel,
      email: parliamentarian.email,
      photoUrl: parliamentarian.photoUrl
    };
  }

  function getReferenceLabel(reference: LegislativeProposal['references'][number]) {
    if (reference.type === 'official') {
      return 'Fonte oficial';
    }

    if (reference.type === 'press') {
      return 'Cobertura de imprensa';
    }

    if (reference.type === 'institutional') {
      return 'Fonte institucional';
    }

    return 'Referência técnica';
  }

  function toParliamentarianBillView(
    proposal: LegislativeProposal,
    parliamentarianId?: string
  ): ParliamentarianBillView {
    const hasReviewedFactualSummary = Boolean(proposal.simplifiedSummary?.trim());

    return {
      id: proposal.id,
      parliamentarianId: parliamentarianId ?? '',
      identification: proposal.title,
      chamber: getChamberLabel(proposal.source),
      type: proposal.type,
      number: proposal.number,
      year: proposal.year,
      subjectLabel: getSubjectLabel(proposal),
      subject: proposal.subject,
      status: proposal.status ?? unavailableOfficialFieldLabel,
      currentStageLabel: proposal.source === 'camara' ? 'Tramitação atual' : undefined,
      currentStage: proposal.currentStage,
      relationship: parliamentarianId
        ? proposal.relationship ?? unavailableVersionFieldLabel
        : proposal.relationship ?? '',
      presentedAt: proposal.presentedAt,
      officialSummary: proposal.officialSummary ?? unavailableOfficialFieldLabel,
      factualSummary: hasReviewedFactualSummary ? proposal.simplifiedSummary : undefined,
      officialFullTextUrl: proposal.officialFullTextUrl,
      sources: proposal.references.map((reference) => ({
        id: reference.id,
        type: reference.type,
        label: getReferenceLabel(reference),
        title: reference.title,
        publisher: reference.publisher,
        url: reference.url,
        checkedAt: reference.checkedAt
      }))
    };
  }

  function normalizeName(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }

  function isOfficialCamaraProposal(proposal: LegislativeProposal) {
    return proposal.source === 'camara' && proposal.id === `camara-proposicao-${proposal.sourceId}`;
  }

  function isOfficialSenadoProposal(proposal: LegislativeProposal) {
    return (
      proposal.source === 'senado' &&
      (proposal.id === `senado-materia-${proposal.sourceId}` ||
        proposal.id === `senado-processo-${proposal.sourceId}`)
    );
  }

  function isOfficialParliamentarian(parliamentarian: Parliamentarian) {
    return parliamentarian.id === `${parliamentarian.source}-${parliamentarian.sourceId}`;
  }

  function isIndividualVoteForParliamentarian(
    individualVote: RollCallVote['individualVotes'][number],
    parliamentarian: Parliamentarian
  ) {
    if (individualVote.parliamentarianId) {
      return individualVote.parliamentarianId === parliamentarian.id;
    }

    return normalizeName(individualVote.parliamentarianName) === normalizeName(parliamentarian.name);
  }

  function getParliamentarianVote(
    vote: RollCallVote,
    parliamentarian: Parliamentarian
  ): DisplayVotePosition | undefined {
    const individualVote = vote.individualVotes.find(
      (currentVote) => isIndividualVoteForParliamentarian(currentVote, parliamentarian)
    );

    return individualVote ? toDisplayVotePosition(individualVote.vote) : undefined;
  }

  function getParliamentarianVoteNotice(vote: RollCallVote, parliamentarianVote?: DisplayVotePosition) {
    if (parliamentarianVote) {
      return undefined;
    }

    if (vote.individualVotes.length > 0) {
      return 'Voto individual do parlamentar não localizado na lista nominal oficial.';
    }

    return unavailableNominalVoteListLabel;
  }

  function toParliamentarianVoteView(
    vote: RollCallVote,
    parliamentarian: Parliamentarian
  ): ParliamentarianVoteView {
    const parliamentarianVote = getParliamentarianVote(vote, parliamentarian);

    return {
      id: vote.id,
      parliamentarianId: parliamentarian.id,
      billIdentification: vote.proposalId,
      chamber: getChamberLabel(vote.source),
      description: vote.description,
      parliamentarianVote,
      parliamentarianVoteNotice: getParliamentarianVoteNotice(vote, parliamentarianVote),
      votedAt: vote.votedAt,
      officialResult: vote.result,
      counts: vote.counts,
      individualVotes: vote.individualVotes.map((individualVote) => ({
        parliamentarianName: individualVote.parliamentarianName,
        party: individualVote.party ?? unavailableOfficialFieldLabel,
        state: individualVote.state ?? unavailableOfficialFieldLabel,
        vote: toDisplayVotePosition(individualVote.vote),
        isSelectedParliamentarian: isIndividualVoteForParliamentarian(
          individualVote,
          parliamentarian
        )
      }))
    };
  }

  function toParliamentarianBillViews(
    proposals: LegislativeProposal[],
    parliamentarian: Parliamentarian | null
  ) {
    if (!parliamentarian) {
      return [];
    }

    return proposals.map((proposal) => toParliamentarianBillView(proposal, parliamentarian.id));
  }

  function toParliamentarianVoteViews(
    votes: RollCallVote[],
    parliamentarian: Parliamentarian | null
  ) {
    if (!parliamentarian) {
      return [];
    }

    return votes.map((vote) => toParliamentarianVoteView(vote, parliamentarian));
  }

  let submittedSearch = $derived(
    chatContext.lastQuery ? { id: searchRenderKey, query: chatContext.lastQuery } : null
  );
  let searchState = $derived(chatContext.currentState);
  let searchResults: SearchResultsView = $derived({
    parliamentarians: chatContext.parliamentariansFound.map(toSearchParliamentarianResult),
    proposals: chatContext.proposalsFound.map(toSearchProposalResult)
  });
  let selectedParliamentarian: ParliamentarianDetailView | null = $derived(
    chatContext.selectedParliamentarian
      ? toParliamentarianDetailView(chatContext.selectedParliamentarian)
      : null
  );
  let selectedBill: ParliamentarianBillView | null = $derived(
    chatContext.selectedProposal
      ? toParliamentarianBillView(
          chatContext.selectedProposal,
          chatContext.selectedParliamentarian?.id
        )
      : null
  );
  let selectedVote: ParliamentarianVoteView | null = $derived(
    chatContext.selectedVote && chatContext.selectedParliamentarian
      ? toParliamentarianVoteView(chatContext.selectedVote, chatContext.selectedParliamentarian)
      : null
  );
  let selectedParliamentarianBills: ParliamentarianBillView[] = $derived(
    toParliamentarianBillViews(
      chatContext.parliamentarianProposals,
      chatContext.selectedParliamentarian
    )
  );
  let selectedParliamentarianVotes: ParliamentarianVoteView[] = $derived(
    toParliamentarianVoteViews(chatContext.voteHistory, chatContext.selectedParliamentarian)
  );
  let selectedParliamentarianIsOfficial = $derived(
    chatContext.selectedParliamentarian
      ? isOfficialParliamentarian(chatContext.selectedParliamentarian)
      : false
  );
  let selectedParliamentarianIsOfficialSenado = $derived(
    selectedParliamentarianIsOfficial && chatContext.selectedParliamentarian?.source === 'senado'
  );
  let selectedParliamentarianBillsEmptyTitle = $derived(
    selectedParliamentarianIsOfficialSenado
      ? officialSenadoAssociatedMattersUnavailableMessage
      : undefined
  );
  let selectedParliamentarianBillsEmptyDescription = $derived(
    selectedParliamentarianIsOfficialSenado
      ? officialSenadoAssociatedMattersUnavailableDescription
      : undefined
  );
  let selectedParliamentarianVotesCoverageDescription = $derived(
    selectedParliamentarianIsOfficial && selectedParliamentarianVotes.length > 0
      ? officialParliamentarianSessionVotesCoverageMessage
      : undefined
  );
  let selectedParliamentarianVotesEmptyTitle = $derived(
    selectedParliamentarianIsOfficialSenado
      ? officialSenadoProposalVotesUnavailableMessage
      : selectedParliamentarianIsOfficial
      ? officialParliamentarianSessionVotesEmptyMessage
      : undefined
  );
  let selectedParliamentarianVotesEmptyDescription = $derived(
    selectedParliamentarianIsOfficialSenado
      ? officialSenadoStaticCoverageDescription
      : selectedParliamentarianIsOfficial
      ? officialParliamentarianStaticCoverageDescription
      : undefined
  );
  let selectedBillVotes: ParliamentarianVoteView[] = $derived(
    chatContext.selectedProposal && chatContext.selectedParliamentarian
      ? toParliamentarianVoteViews(chatContext.voteHistory, chatContext.selectedParliamentarian)
      : []
  );
  let selectedBillShowsOfficialVotes = $derived(
    chatContext.selectedProposal && chatContext.selectedParliamentarian
      ? isOfficialCamaraProposal(chatContext.selectedProposal)
      : false
  );
  let selectedBillUnavailableVotesTitle = $derived(
    chatContext.selectedProposal && isOfficialSenadoProposal(chatContext.selectedProposal)
      ? officialSenadoProposalVotesUnavailableMessage
      : undefined
  );
  let selectedBillUnavailableVotesDescription = $derived(
    chatContext.selectedProposal && isOfficialSenadoProposal(chatContext.selectedProposal)
      ? officialSenadoStaticCoverageDescription
      : undefined
  );
  let recoverableNotice = $derived(chatContext.errorMessage.trim());

  function handleSearch(query: string) {
    searchRenderKey += 1;
    void executeSearch(query);
  }

  function handleSelectParliamentarian(id: string) {
    void selectParliamentarianById(id);
  }

  function handleOpenParliamentarianBills() {
    void openParliamentarianBills();
  }

  function handleOpenParliamentarianVotes() {
    openParliamentarianVotes();
  }

  function handleSelectBill(id: string) {
    void selectProposalById(id);
  }

  function handleSelectVote(id: string) {
    selectVoteById(id);
  }

  function handleOpenAbout() {
    navigateTo('ABOUT');
  }

  function handleBackFromAbout() {
    goBack();
  }

  function handleBackToParliamentarian() {
    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_DETAIL', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });
  }

  function handleBackToBills() {
    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_BILLS', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });
  }

  function handleBackToVotes() {
    if (selectedBill) {
      navigateTo('BILL_DETAIL', {
        updates: {
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    if (!selectedParliamentarian) {
      navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
        updates: {
          selectedProposal: null,
          selectedVote: null,
          errorMessage: ''
        },
        recordHistory: false
      });
      return;
    }

    navigateTo('PARLIAMENTARIAN_VOTES', {
      updates: {
        selectedProposal: null,
        selectedVote: null,
        errorMessage: ''
      },
      recordHistory: false
    });
  }

  function handleBackToResults() {
    navigateTo(submittedSearch ? 'SEARCH_RESULTS' : 'WELCOME', {
      updates: {
        selectedParliamentarian: null,
        parliamentarianProposals: [],
        selectedProposal: null,
        selectedVote: null,
        voteHistory: [],
        errorMessage: ''
      },
      recordHistory: false
    });
  }

  function handleStartOver() {
    reset();
    searchRenderKey += 1;
    searchFormResetToken += 1;
  }

  onDestroy(() => {
    unsubscribeChatStore();
    reset();
  });
</script>

<svelte:head>
  <title>O que o parlamentar fez</title>
</svelte:head>

<main id="conteudo" tabindex="-1" class="box-border min-h-dvh px-page py-4 sm:py-5 lg:py-6">
  <section
    class="mx-auto grid w-full max-w-shell gap-4 border-t-4 border-civic pt-4 sm:gap-5 lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,0.82fr)_minmax(22rem,1.18fr)] lg:items-start"
    aria-labelledby="home-title"
  >
    <div class="max-w-readable">
      <div class="flex min-w-0 items-center gap-3">
        <ProductLogo showText={false} decorative class="shrink-0" />
        <p class="text-kicker font-bold uppercase tracking-normal text-accent">Consulta pública</p>
      </div>
      <h1
        id="home-title"
        class="mt-2 max-w-[18ch] text-3xl font-semibold leading-tight tracking-normal text-ink sm:text-4xl lg:text-4xl"
      >
        O que o parlamentar fez
      </h1>
      <div class="mt-4 space-y-2 text-sm leading-6 text-ink-muted sm:text-base">
        <p class="font-medium text-ink">
          Ferramenta pública para consultar projetos e votações do Congresso Nacional.
        </p>
        <p>
          Dados exibidos a partir de registros oficiais disponíveis.
        </p>
      </div>

      <div class="mt-5">
        <InitialSearchForm onSearch={handleSearch} resetToken={searchFormResetToken} />
      </div>

      <div class="mt-3">
        <button
          type="button"
          class="min-h-11 rounded-ui border border-border bg-surface-raised px-4 py-2 text-sm font-bold text-ink transition hover:border-accent"
          onclick={handleOpenAbout}
        >
          Sobre e privacidade
        </button>
      </div>
    </div>

    <ConversationLog title="Conversa de consulta" busy={searchState === 'SEARCHING'}>
      <ConversationBubble>
        <p>Informe um parlamentar ou uma proposição para iniciar a consulta.</p>
      </ConversationBubble>

      {#if searchState === 'ABOUT'}
        <ConversationBubble tone="user">
          <p class="text-xs font-bold uppercase tracking-normal opacity-80">Área informativa</p>
          <p class="mt-1">Sobre e privacidade</p>
        </ConversationBubble>

        <ConversationBubble tone="status">
          <AboutPrivacyInfo onBack={handleBackFromAbout} onStartOver={handleStartOver} />
        </ConversationBubble>
      {:else if submittedSearch}
        {#key submittedSearch.id}
          <ConversationBubble tone="user">
            <p class="text-xs font-bold uppercase tracking-normal opacity-80">Termo informado</p>
            <p class="mt-1 break-words">{submittedSearch.query}</p>
          </ConversationBubble>

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
              {#if recoverableNotice}
                <p
                  class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                  role="status"
                >
                  {recoverableNotice}
                </p>
              {/if}
              <SearchResults
                query={submittedSearch.query}
                results={searchResults}
                onSelectParliamentarian={handleSelectParliamentarian}
                onSelectProposal={handleSelectBill}
              />
            </ConversationBubble>
          {:else if searchState === 'ERROR'}
            <ConversationBubble tone="status">
              <div role="alert">
                <p class="font-semibold">A busca não foi concluída.</p>
                <p class="mt-2 text-sm leading-6 text-ink-muted">
                  {chatContext.errorMessage}
                </p>
              </div>
              <button
                type="button"
                class="mt-4 min-h-12 rounded-ui bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-strong"
                onclick={handleStartOver}
              >
                Nova consulta
              </button>
            </ConversationBubble>
          {:else if searchState === 'PARLIAMENTARIAN_DETAIL' && selectedParliamentarian}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Parlamentar selecionado
              </p>
              <p class="mt-1 break-words">{selectedParliamentarian.name}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              {#if recoverableNotice}
                <p
                  class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                  role="status"
                >
                  {recoverableNotice}
                </p>
              {/if}
              <ParliamentarianDetail
                parliamentarian={selectedParliamentarian}
                onOpenBills={handleOpenParliamentarianBills}
                onOpenVotes={handleOpenParliamentarianVotes}
                onBackToResults={handleBackToResults}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'PARLIAMENTARIAN_BILLS' && selectedParliamentarian}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Consulta selecionada
              </p>
              <p class="mt-1 break-words">Proposições de {selectedParliamentarian.name}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              {#if recoverableNotice}
                <p
                  class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                  role="status"
                >
                  {recoverableNotice}
                </p>
              {/if}
              <ParliamentarianBills
                parliamentarianName={selectedParliamentarian.name}
                bills={selectedParliamentarianBills}
                emptyTitle={selectedParliamentarianBillsEmptyTitle}
                emptyDescription={selectedParliamentarianBillsEmptyDescription}
                onSelectBill={handleSelectBill}
                onBackToParliamentarian={handleBackToParliamentarian}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'PARLIAMENTARIAN_VOTES' && selectedParliamentarian}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Consulta selecionada
              </p>
              <p class="mt-1 break-words">Votações disponíveis de {selectedParliamentarian.name}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              {#if recoverableNotice}
                <p
                  class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                  role="status"
                >
                  {recoverableNotice}
                </p>
              {/if}
              <ParliamentarianVotes
                parliamentarianName={selectedParliamentarian.name}
                votes={selectedParliamentarianVotes}
                coverageDescription={selectedParliamentarianVotesCoverageDescription}
                emptyTitle={selectedParliamentarianVotesEmptyTitle}
                emptyDescription={selectedParliamentarianVotesEmptyDescription}
                onSelectVote={handleSelectVote}
                onBackToParliamentarian={handleBackToParliamentarian}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'BILL_DETAIL' && selectedBill}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Proposição selecionada
              </p>
              <p class="mt-1 break-words">{selectedBill.identification}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              {#if recoverableNotice}
                <p
                  class="mb-4 border-l-4 border-accent pl-3 text-sm leading-6 text-ink-muted"
                  role="status"
                >
                  {recoverableNotice}
                </p>
              {/if}
              <BillDetail
                bill={selectedBill}
                parliamentarianName={selectedParliamentarian?.name}
                associatedVotes={selectedBillVotes}
                showOfficialVotes={selectedBillShowsOfficialVotes}
                unavailableVotesTitle={selectedBillUnavailableVotesTitle}
                unavailableVotesDescription={selectedBillUnavailableVotesDescription}
                onSelectVote={handleSelectVote}
                onBackToBills={handleBackToBills}
                onBackToParliamentarian={handleBackToParliamentarian}
                onBackToResults={handleBackToResults}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {:else if searchState === 'BILL_VOTES' && selectedParliamentarian && selectedVote}
            <ConversationBubble tone="user">
              <p class="text-xs font-bold uppercase tracking-normal opacity-80">
                Votação selecionada
              </p>
              <p class="mt-1 break-words">{selectedVote.billIdentification}</p>
            </ConversationBubble>

            <ConversationBubble tone="status">
              <BillVotes
                vote={selectedVote}
                parliamentarianName={selectedParliamentarian.name}
                onBackToVotes={handleBackToVotes}
                onBackToParliamentarian={handleBackToParliamentarian}
                onStartOver={handleStartOver}
              />
            </ConversationBubble>
          {/if}
        {/key}
      {/if}
    </ConversationLog>
  </section>
</main>
