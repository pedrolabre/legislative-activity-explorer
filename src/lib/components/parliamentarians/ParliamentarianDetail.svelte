<script lang="ts">
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
    email?: string;
    photoUrl?: string;
  }

  let {
    parliamentarian,
    onOpenBills,
    onOpenVotes,
    onBackToResults,
    onStartOver
  }: {
    parliamentarian: ParliamentarianDetailView;
    onOpenBills: () => void;
    onOpenVotes: () => void;
    onBackToResults: () => void;
    onStartOver: () => void;
  } = $props();

  const unavailableOfficialFieldLabel = 'Não informado pela fonte oficial consultada.';
  const unavailableVersionFieldLabel = 'Ainda não conectado nesta versão.';

  function formatOptional(value?: string, fallback = unavailableOfficialFieldLabel) {
    return value?.trim() ? value : fallback;
  }

  function getInitials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toLocaleUpperCase('pt-BR');
  }

  let initials = $derived(getInitials(parliamentarian.name));
</script>

<div class="space-y-6">
  <header class="grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start">
    {#if parliamentarian.photoUrl}
      <img
        src={parliamentarian.photoUrl}
        alt={`Foto de ${parliamentarian.name}`}
        width="112"
        height="112"
        loading="lazy"
        decoding="async"
        class="h-28 w-28 rounded-ui border border-border bg-surface object-cover"
      />
    {:else}
      <div
        class="flex h-28 w-28 items-center justify-center rounded-ui border border-border bg-surface text-2xl font-bold text-accent"
        role="img"
        aria-label={`Foto não informada pela fonte oficial consultada para ${parliamentarian.name}`}
      >
        <span aria-hidden="true">{initials}</span>
      </div>
    {/if}

    <div class="min-w-0">
      <p class="text-xs font-bold uppercase leading-5 tracking-normal text-accent">
        Perfil parlamentar
      </p>
      <h3 class="mt-2 break-words text-2xl font-semibold leading-8 text-ink">
        {parliamentarian.name}
      </h3>
      <dl class="mt-4 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-3">
        <div>
          <dt class="font-bold text-ink">Partido</dt>
          <dd>{parliamentarian.party}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">UF</dt>
          <dd>{parliamentarian.state}</dd>
        </div>
        <div>
          <dt class="font-bold text-ink">Situação</dt>
          <dd>{parliamentarian.status}</dd>
        </div>
      </dl>
    </div>
  </header>

  <section class="border-t border-border pt-5" aria-labelledby="parliamentarian-facts-title">
    <h4 id="parliamentarian-facts-title" class="text-sm font-bold leading-6 text-ink">
      Dados factuais
    </h4>
    <dl class="mt-3 grid gap-3 text-sm leading-6 text-ink-muted sm:grid-cols-2">
      <div>
        <dt class="font-bold text-ink">Nome civil</dt>
        <dd class:text-ink-muted={!parliamentarian.fullName}>
          {formatOptional(parliamentarian.fullName)}
        </dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Cargo</dt>
        <dd>{parliamentarian.office}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Casa legislativa</dt>
        <dd>{parliamentarian.chamber}</dd>
      </div>
      <div>
        <dt class="font-bold text-ink">Mandato</dt>
        <dd class:text-ink-muted={!parliamentarian.term}>
          {formatOptional(parliamentarian.term, unavailableVersionFieldLabel)}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="font-bold text-ink">E-mail institucional</dt>
        <dd class:text-ink-muted={!parliamentarian.email}>
          {formatOptional(parliamentarian.email)}
        </dd>
      </div>
    </dl>
  </section>

  <section class="border-t border-border pt-5" aria-labelledby="related-consultations-title">
    <h4 id="related-consultations-title" class="text-sm font-bold leading-6 text-ink">
      Consultas relacionadas
    </h4>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <button
          type="button"
          class="min-h-12 w-full rounded-ui bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-strong"
          aria-label={`Abrir proposições associadas de ${parliamentarian.name}`}
          onclick={onOpenBills}
        >
          Proposições
        </button>
        <p class="mt-2 text-sm leading-6 text-ink-muted">
          Abrir lista associada ao parlamentar.
        </p>
      </div>
      <div>
        <button
          type="button"
          class="min-h-12 w-full rounded-ui bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-accent-strong"
          aria-label={`Abrir votações associadas de ${parliamentarian.name}`}
          onclick={onOpenVotes}
        >
          Votações
        </button>
        <p class="mt-2 text-sm leading-6 text-ink-muted">
          Abrir cobertura de votações desta versão.
        </p>
      </div>
    </div>
  </section>

  <div class="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:flex-wrap">
    <button
      type="button"
      class="min-h-12 rounded-ui border border-border bg-surface-raised px-4 py-3 text-sm font-bold text-ink transition hover:border-accent"
      onclick={onBackToResults}
    >
      Voltar aos resultados
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
