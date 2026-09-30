<script lang="ts">
  import { unavailableOfficialFieldLabel } from '$lib/ui/officialMessages';

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
  let hasTerm = $derived(Boolean(parliamentarian.term?.trim()));
  let termLabel = $derived(parliamentarian.termLabel ?? 'Mandato');
  let identityText = $derived(
    [
      parliamentarian.office,
      parliamentarian.party,
      parliamentarian.state,
      hasTerm ? parliamentarian.term : null
    ]
      .filter(Boolean)
      .join(' · ')
  );
</script>

<div class="profile-container">
  <div class="profile">
    <aside class="profile-left">
      {#if parliamentarian.photoUrl}
        <img
          src={parliamentarian.photoUrl}
          alt={`Foto de ${parliamentarian.name}`}
          width="78"
          height="78"
          loading="lazy"
          decoding="async"
          class="photo"
        />
      {:else}
        <div
          class="photo photo-fallback"
          role="img"
          aria-label={`Foto não informada pela fonte oficial consultada para ${parliamentarian.name}`}
        >
          <span aria-hidden="true">{initials}</span>
        </div>
      {/if}

      <button
        type="button"
        class="btn primary profile-btn"
        onclick={onStartOver}
      >
        Nova consulta
      </button>

      <button
        type="button"
        class="btn secondary profile-btn"
        onclick={onBackToResults}
      >
        ← Voltar aos resultados
      </button>
    </aside>

    <div class="profile-main">
      <div class="profile-heading">
        <h2 class="name">{parliamentarian.name}</h2>
        <p class="identity">{identityText}</p>
      </div>

      <dl class="facts">
        <div class="fact">
          <dt>Nome civil</dt>
          <dd class:fact-muted={!parliamentarian.fullName}>
            {formatOptional(parliamentarian.fullName)}
          </dd>
        </div>
        <div class="fact">
          <dt>Casa</dt>
          <dd>{parliamentarian.chamber}</dd>
        </div>
        {#if hasTerm}
          <div class="fact">
            <dt>{termLabel}</dt>
            <dd>{parliamentarian.term}</dd>
          </div>
        {/if}
        <div class="fact">
          <dt>Situação</dt>
          <dd>{parliamentarian.status}</dd>
        </div>
        <div class="fact">
          <dt>E-mail</dt>
          <dd class:fact-muted={!parliamentarian.email}>
            {formatOptional(parliamentarian.email)}
          </dd>
        </div>
      </dl>

      <div class="actions">
        <div class="action">
          <strong>Proposições do parlamentar</strong>
          <p>Abrir lista associada ao parlamentar.</p>
          <button
            type="button"
            class="btn primary"
            aria-label={`Abrir proposições associadas de ${parliamentarian.name}`}
            onclick={onOpenBills}
          >
            Abrir proposições
          </button>
        </div>
        <div class="action">
          <strong>Votações disponíveis</strong>
          <p>Abrir votos oficiais já disponíveis nesta consulta.</p>
          <button
            type="button"
            class="btn primary"
            aria-label={`Abrir votações disponíveis de ${parliamentarian.name}`}
            onclick={onOpenVotes}
          >
            Abrir votações
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .profile-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .profile {
    display: grid;
    grid-template-columns: 105px 1fr;
    gap: 14px;
    align-items: start;
    height: 100%;
  }

  .profile-left {
    border-right: 1px solid var(--border);
    padding-right: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .photo {
    width: 78px;
    height: 78px;
    border: 1px solid var(--border);
    border-radius: 8px;
    object-fit: cover;
    background: var(--surface);
    display: block;
  }

  .photo-fallback {
    display: grid;
    place-items: center;
    color: var(--accent);
    font-weight: 800;
    font-size: 20px;
  }

  .profile-left .btn {
    width: 100%;
    min-height: 30px;
    padding: 0 7px;
    font-size: 9px;
    font-weight: 800;
    line-height: 1.2;
    text-align: center;
  }

  .profile-main {
    min-width: 0;
    display: grid;
    grid-template-rows: auto auto auto;
    align-content: start;
    gap: 10px;
  }

  .profile-heading {
    min-width: 0;
  }

  .name {
    margin: 0;
    font-size: 22px;
    line-height: 1.05;
    font-weight: 650;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .identity {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 10px;
    font-weight: 500;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .facts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 7px;
    margin: 0;
    padding: 0;
  }

  .fact {
    min-width: 0;
    border-top: 1px solid var(--border);
    padding-top: 7px;
  }

  .fact dt {
    font-size: 8px;
    text-transform: uppercase;
    font-weight: 850;
    color: var(--muted);
    letter-spacing: 0.02em;
  }

  .fact dd {
    margin: 3px 0 0;
    font-size: 10px;
    line-height: 1.3;
    font-weight: 600;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .fact-muted {
    color: var(--muted);
    font-weight: 500;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 2px;
  }

  .action {
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 9px;
    display: flex;
    flex-direction: column;
  }

  .action strong {
    font-size: 11px;
    font-weight: 750;
    color: var(--ink);
  }

  .action p {
    margin: 2px 0 6px;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.25;
    flex: 1;
  }

  .action .btn {
    width: 100%;
    min-height: 28px;
    font-size: 9px;
    font-weight: 800;
  }

  @media (max-width: 900px) {
    .facts {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 700px) {
    .profile {
      grid-template-columns: 85px 1fr;
      gap: 10px;
    }

    .profile-left {
      padding-right: 8px;
      gap: 6px;
    }

    .photo {
      width: 64px;
      height: 64px;
    }

    .photo-fallback {
      font-size: 16px;
    }

    .facts {
      grid-template-columns: 1fr 1fr;
    }

    .name {
      font-size: 18px;
    }

    .actions {
      grid-template-columns: 1fr;
    }
  }
</style>
